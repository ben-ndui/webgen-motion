import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useEffect, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { serieSaya } from "../../../../../../../remotion/film/cinema/serie-exemple.test-utils";
import type { CinemaDuFilm } from "../../../../../../../remotion/film/cinema/types";
import { FILM } from "../../../../../../../remotion/film/film";
import type { FilmSpec } from "../../../../../../../remotion/film/spec";
import EtapeSerie from "./etape-serie";
import { INTERVALLE_DE_SUIVI_MS } from "./use-suivi-des-plans";

// Un banc qui tient une VRAIE fiche, modifiée comme le fait l'assistant.
let ficheCourante: FilmSpec;
function Banc({ cinema, enregistrer = async () => true }: { cinema?: CinemaDuFilm; enregistrer?: () => Promise<boolean> }) {
  const [fiche, setFiche] = useState<FilmSpec>(() => ({ ...structuredClone(FILM), cinema }));
  useEffect(() => {
    ficheCourante = fiche;
  }, [fiche]);
  const modifier = (changement: (copie: FilmSpec) => void) =>
    setFiche((avant) => {
      const copie = structuredClone(avant);
      changement(copie);
      return copie;
    });
  return <EtapeSerie id="saya" fiche={fiche} modifier={modifier} enregistrer={enregistrer} />;
}

const BUDGET = { utilises: 0, plafond: 20 };
type Reponse = { statut?: number; corps: unknown };
// Un faux serveur : une réponse par « METHODE chemin », la dernière se répète.
function serveur(routes: Record<string, Reponse[]>) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (url, options) => {
    const cle = `${options?.method ?? "GET"} ${String(url)}`;
    const file = routes[cle] ?? [{ statut: 404, corps: { erreur: "inconnu" } }];
    const reponse = file.length > 1 ? file.shift()! : file[0]!;
    return new Response(JSON.stringify(reponse.corps), { status: reponse.statut ?? 200 });
  });
}
const plan = (id: string) => `/api/motion/film/saya/cinema/plans/${id}`;
const vide = (): Reponse => ({ corps: { plan: { etat: "vide" }, budget: BUDGET } });
// Les deux scènes ont chacune un plan ouvert : on vise la scène 1.
const scene1 = () => within(screen.getByRole("region", { name: "Scène 1" }));
const avecPortrait = () => {
  const serie = serieSaya();
  serie.personnages[0].portrait = "cinema/personnages/awa.jpg";
  return serie;
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("étape « Série »", () => {
  it("sans série : on explique, et un clic crée une série de départ valide", () => {
    serveur({});
    render(<Banc />);
    fireEvent.click(screen.getByRole("button", { name: "Commencer la série à la main" }));
    expect(ficheCourante.cinema?.episodes[0].scenes[0].plans[0].id).toBe("plan-1");
    expect(screen.getByRole("button", { name: /Ajouter un personnage/ })).toBeInTheDocument();
  });

  it("le coût et le modèle sont affichés AVANT le clic : Fast avec Awa, Lite pour l'objet seul", async () => {
    serveur({ [`GET ${plan("rangement")}`]: [vide()], [`GET ${plan("flacon")}`]: [vide()], [`GET ${plan("confidence")}`]: [vide()] });
    render(<Banc cinema={avecPortrait()} />);
    expect(scene1().getByRole("button", { name: "Générer ce plan (0,96 $)" })).toBeEnabled();
    expect(scene1().getByText("Veo Fast : Awa est à l'image : Fast garde le même visage.")).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("list", { name: "Plans de la scène 1" })).getByRole("button", { name: /Plan 2/ }));
    expect(scene1().getByRole("button", { name: "Générer ce plan (0,64 $)" })).toBeInTheDocument();
  });

  it("sans portrait, le bouton est grisé et dit quoi faire", () => {
    serveur({ [`GET ${plan("rangement")}`]: [vide()] });
    render(<Banc cinema={serieSaya()} />);
    expect(scene1().getByRole("button", { name: "Générer ce plan (0,96 $)" })).toBeDisabled();
    expect(scene1().getByText("Awa n'a pas encore de portrait : génère-le dans le casting.")).toBeInTheDocument();
  });

  it("générer enregistre d'abord, lance, puis suit le plan jusqu'à sa vidéo", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const appels = serveur({
      [`GET ${plan("rangement")}`]: [vide(), { corps: { plan: { etat: "en-cours" }, budget: BUDGET } }, { corps: { plan: { etat: "pret", fichier: "cinema/rangement.mp4" }, budget: { utilises: 1, plafond: 20 } } }],
      [`POST ${plan("rangement")}`]: [{ corps: { plan: { etat: "en-cours" }, budget: { utilises: 1, plafond: 20 } } }],
    });
    const enregistrer = vi.fn(async () => true);
    const { container } = render(<Banc cinema={avecPortrait()} enregistrer={enregistrer} />);
    await waitFor(() => expect(scene1().getByRole("button", { name: "Générer ce plan (0,96 $)" })).toBeEnabled());
    fireEvent.click(scene1().getByRole("button", { name: "Générer ce plan (0,96 $)" }));
    expect(await screen.findByText(/Google génère ce plan/)).toBeInTheDocument();
    expect(enregistrer).toHaveBeenCalled();
    expect(appels.mock.calls.some(([url, options]) => String(url) === plan("rangement") && options?.method === "POST")).toBe(true);
    // Horloge simulée : React applique ses effets pendant l'avance du temps,
    // la minuterie naît donc au premier pas. On avance tick par tick.
    for (let tick = 0; tick < 3; tick++) {
      await act(async () => void vi.advanceTimersByTime(INTERVALLE_DE_SUIVI_MS));
    }
    await waitFor(() => expect(container.querySelector("video")?.getAttribute("src")).toContain("cinema%2Frangement.mp4"));
    expect(screen.getByText("1 plan payé sur 20.", { exact: false })).toBeInTheDocument();
  });

  it("un enregistrement raté ne lance rien (on ne paie pas un plan sur une consigne périmée)", async () => {
    const appels = serveur({ [`GET ${plan("rangement")}`]: [vide()] });
    render(<Banc cinema={avecPortrait()} enregistrer={async () => false} />);
    await waitFor(() => expect(scene1().getByRole("button", { name: "Générer ce plan (0,96 $)" })).toBeEnabled());
    fireEvent.click(scene1().getByRole("button", { name: "Générer ce plan (0,96 $)" }));
    expect(await screen.findByText("Enregistrement impossible : rien n'a été lancé.")).toBeInTheDocument();
    expect(appels.mock.calls.every(([, options]) => options?.method !== "POST")).toBe(true);
  });

  it("Studio absent ou clé manquante : un seul message en haut, et les boutons grisés", async () => {
    serveur({ [`GET ${plan("rangement")}`]: [{ statut: 412, corps: { erreur: "Aucune clé Gemini : ajoute-la dans les Réglages pour générer." } }] });
    render(<Banc cinema={avecPortrait()} />);
    const alerte = (await screen.findAllByRole("alert")).find((element) => element.closest(".serie") && !element.closest(".bloc"))!;
    expect(alerte).toHaveTextContent("Aucune clé Gemini");
    expect(within(alerte).getByRole("link", { name: "Ouvrir les Réglages" })).toHaveAttribute("href", "/setup");
    expect(scene1().getByRole("button", { name: "Générer ce plan (0,96 $)" })).toBeDisabled();
  });

  it("le portrait généré s'affiche et entre dans la fiche", async () => {
    serveur({
      [`GET ${plan("rangement")}`]: [vide()],
      ["POST /api/motion/film/saya/cinema/personnages/awa/portrait"]: [{ corps: { portrait: "cinema/personnages/awa.jpg" } }],
    });
    render(<Banc cinema={serieSaya()} />);
    fireEvent.click(screen.getByRole("button", { name: "Générer son portrait (0,05 $)" }));
    expect(await screen.findByRole("img", { name: "Portrait de Awa" })).toBeInTheDocument();
    expect(ficheCourante.cinema?.personnages[0].portrait).toBe("cinema/personnages/awa.jpg");
  });

  it("un plan neuf, pas encore enregistré, est « à écrire », pas en erreur", async () => {
    serveur({ [`GET ${plan("rangement")}`]: [vide()] });
    render(<Banc cinema={avecPortrait()} />);
    fireEvent.click(within(screen.getByRole("list", { name: "Plans de la scène 1" })).getByRole("button", { name: "Ajouter un plan" }));
    expect(await screen.findByRole("region", { name: "Plan 3" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(scene1().getByText("Écris d'abord ce qui se passe dans ce plan.")).toBeInTheDocument();
  });
});
