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
const bibleRoute = "/api/motion/film/saya/cinema/bible";
const vide = (): Reponse => ({ corps: { plan: { etat: "vide" }, budget: BUDGET } });
// La bible vide : aucune route de bible n'est testée ici si elle n'est pas précisée.
const bibleVide = (): Reponse => ({ corps: { references: [] } });
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

  it("cliquer « Commencer la série à la main » pendant qu'une proposition de Claude est en attente ne la fait pas disparaître", async () => {
    // « Commencer » fait aussitôt apparaître SerieDuFilm, qui lance ses propres
    // fetch (bible, suivi des plans) : seule la requête à l'assistant doit
    // rester en attente, les autres répondent tout de suite pour ne pas
    // bloquer le reste de l'écran.
    let resoudreAssistant!: (reponse: Response) => void;
    const assistantRoute = "/api/motion/film/saya/cinema/assistant";
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, options) => {
      if (String(url) === assistantRoute && options?.method === "POST") {
        return new Promise((resolve) => void (resoudreAssistant = resolve));
      }
      return new Response(JSON.stringify({ references: [] }), { status: 200 });
    });
    render(<Banc />);
    fireEvent.change(screen.getByPlaceholderText("Colle ici le texte de sa bible…"), {
      target: { value: "Henrik est un personnage de la bible de production." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Importer avec Claude" }));
    // La demande à Claude est en vol (pas encore résolue) : la série est créée entre-temps par l'autre bouton.
    fireEvent.click(screen.getByRole("button", { name: "Commencer la série à la main" }));
    expect(ficheCourante.cinema).toBeDefined();
    resoudreAssistant(
      new Response(
        JSON.stringify({ proposition: { type: "importer-bible", personnages: [{ id: "henrik", nom: "Henrik", description: "Un homme grand." }], elements: [], episodes: [] } }),
        { status: 200 },
      ),
    );
    // La proposition, déjà payée, doit tout de même s'afficher : le bloc d'import n'a pas été démonté par la bascule.
    await screen.findByRole("region", { name: "Proposition de Claude" });
    fireEvent.click(screen.getByRole("button", { name: "Garder" }));
    expect(ficheCourante.cinema?.personnages.map((p) => p.id)).toContain("henrik");
    // La série créée entre-temps par « Commencer » n'a pas été perdue (l'épisode d'exemple y est toujours).
    expect(ficheCourante.cinema?.episodes[0].scenes[0].plans[0].id).toBe("plan-1");
  });

  it("un import gardé PENDANT que Claude écrit un épisode n'est pas écrasé à son retour", async () => {
    const scenarioRoute = "/api/motion/film/saya/cinema/scenario";
    const assistantRoute = "/api/motion/film/saya/cinema/assistant";
    let resoudreScenario!: (reponse: Response) => void;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, options) => {
      const cle = `${options?.method ?? "GET"} ${String(url)}`;
      if (cle === `POST ${scenarioRoute}`) return new Promise((resolve) => void (resoudreScenario = resolve));
      if (cle === `POST ${assistantRoute}`) {
        return new Response(
          JSON.stringify({ proposition: { type: "importer-bible", personnages: [{ id: "henrik", nom: "Henrik", description: "Un homme grand." }], elements: [], episodes: [] } }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ references: [] }), { status: 200 });
    });
    render(<Banc />);

    // Lance l'écriture d'un épisode avec Claude : la demande part, reste en vol.
    fireEvent.change(screen.getByPlaceholderText("Une cliente entre dans la boutique un soir de pluie et reconnaît le parfum de sa grand-mère."), {
      target: { value: "Une cliente entre et reconnaît un parfum." },
    });
    fireEvent.click(screen.getByRole("button", { name: /Écrire l'épisode/ }));
    await screen.findByText("Claude écrit l'épisode…");

    // Pendant ce temps, elle importe sa bible et garde la proposition : Henrik est ajouté en mémoire.
    fireEvent.change(screen.getByPlaceholderText("Colle ici le texte de sa bible…"), { target: { value: "Henrik est un personnage de la bible de production." } });
    fireEvent.click(screen.getByRole("button", { name: "Importer avec Claude" }));
    await screen.findByRole("region", { name: "Proposition de Claude" });
    fireEvent.click(screen.getByRole("button", { name: "Garder" }));
    expect(ficheCourante.cinema?.personnages.map((p) => p.id)).toContain("henrik");

    // La réponse de Claude arrive enfin : construite avant l'import, elle ne connaît pas Henrik.
    const proposeAvecLea: CinemaDuFilm = {
      personnages: [{ id: "lea", nom: "Léa", description: "x" }],
      episodes: [
        { id: "ep1", titre: "Épisode 1", scenes: [{ id: "scene-1", decor: "x", plans: [{ id: "plan-1", consigne: "x", personnages: [], objet: false }] }] },
        { id: "ep2", titre: "La rencontre", scenes: [{ id: "scene-2", decor: "x", plans: [{ id: "plan-2", consigne: "x", personnages: ["lea"], objet: false }] }] },
      ],
    };
    resoudreScenario(new Response(JSON.stringify({ cinema: proposeAvecLea, episodeId: "ep2" }), { status: 200 }));

    await waitFor(() => expect(ficheCourante.cinema?.personnages.map((p) => p.nom)).toContain("Léa"));
    // Henrik, gardé entre-temps, n'a pas disparu : la série n'a pas été remplacée en bloc.
    expect(ficheCourante.cinema?.personnages.map((p) => p.id)).toContain("henrik");
    expect(ficheCourante.cinema?.episodes).toHaveLength(2);
  });

  it("sans série : déposer un document crée la série ET applique l'import, sans clic préalable sur « Commencer »", async () => {
    const assistantRoute = "/api/motion/film/saya/cinema/assistant";
    serveur({
      [`POST ${assistantRoute}`]: [
        {
          corps: {
            proposition: {
              type: "importer-bible",
              personnages: [{ id: "henrik", nom: "Henrik", description: "Un homme grand." }],
              elements: [],
              episodes: [],
            },
          },
        },
      ],
    });
    render(<Banc />);
    // Le bloc d'import est déjà visible, sans avoir cliqué « Commencer la série à la main ».
    fireEvent.change(screen.getByPlaceholderText("Colle ici le texte de sa bible…"), {
      target: { value: "Henrik est un personnage de la bible de production." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Importer avec Claude" }));
    await screen.findByRole("region", { name: "Proposition de Claude" });
    fireEvent.click(screen.getByRole("button", { name: "Garder" }));
    expect(ficheCourante.cinema?.personnages.map((p) => p.id)).toContain("henrik");
    // La série de départ (épisode d'exemple) a bien été créée au passage.
    expect(ficheCourante.cinema?.episodes[0].scenes[0].plans[0].id).toBe("plan-1");
    // L'écran a vraiment basculé sur la série (pas seulement la fiche en mémoire).
    expect(screen.getByRole("button", { name: /Ajouter un personnage/ })).toBeInTheDocument();
  });

  it("le coût et le modèle sont affichés AVANT le clic : Fast avec Awa, Lite pour l'objet seul", async () => {
    serveur({
      [`GET ${plan("rangement")}`]: [vide()],
      [`GET ${plan("flacon")}`]: [vide()],
      [`GET ${plan("confidence")}`]: [vide()],
      [`GET ${bibleRoute}`]: [bibleVide()],
    });
    render(<Banc cinema={avecPortrait()} />);
    // Laisse la bible (fetch async) se résoudre avant la suite : sinon sa mise à jour d'état fuit sur le test suivant.
    await screen.findByRole("heading", { name: "La bible visuelle" });
    expect(scene1().getByRole("button", { name: "Générer ce plan (0,96 $)" })).toBeEnabled();
    expect(scene1().getByText("Veo Fast : Awa est à l'image : Fast garde le même visage.")).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("list", { name: "Plans de la scène 1" })).getByRole("button", { name: /Plan 2/ }));
    expect(scene1().getByRole("button", { name: "Générer ce plan (0,64 $)" })).toBeInTheDocument();
  });

  it("une référence connue de la bible mais pas encore validée grise le bouton AVANT le clic", async () => {
    const propose = { id: "awa", type: "personnage", nom: "Awa", description: serieSaya().personnages[0].description, fiche: { statut: "propose", vues: {}, journal: [] } };
    serveur({ [`GET ${plan("rangement")}`]: [vide()], [`GET ${bibleRoute}`]: [{ corps: { references: [propose] } }] });
    render(<Banc cinema={serieSaya()} />);
    await screen.findByRole("article", { name: "Personnage Awa" });
    await waitFor(() => expect(scene1().getByRole("button", { name: "Générer ce plan (0,96 $)" })).toBeDisabled());
    expect(scene1().getByText("Awa n'a pas encore d'image validée dans la bible.")).toBeInTheDocument();
  });

  it("au premier affichage, l'enregistrement est forcé AVANT de lire la bible (une série tout juste commencée n'existe pas encore sur le disque)", async () => {
    const enregistrer = vi.fn(async () => true);
    serveur({ [`GET ${plan("rangement")}`]: [vide()], [`GET ${bibleRoute}`]: [bibleVide()] });
    render(<Banc cinema={avecPortrait()} enregistrer={enregistrer} />);
    await screen.findByRole("heading", { name: "La bible visuelle" });
    await waitFor(() => expect(enregistrer).toHaveBeenCalled());
  });

  it("bible pas encore chargée (fetch en vol) : le clic affiche le refus que le serveur renvoie", async () => {
    serveur({
      [`GET ${plan("rangement")}`]: [vide()],
      [`GET ${bibleRoute}`]: [{ statut: 500, corps: { erreur: "injoignable" } }],
      [`POST ${plan("rangement")}`]: [{ statut: 409, corps: { erreur: "Awa n'a pas encore d'image validée dans la bible : valide-la d'abord, sinon son visage changerait d'un plan à l'autre." } }],
    });
    render(<Banc cinema={serieSaya()} />);
    await waitFor(() => expect(scene1().getByRole("button", { name: "Générer ce plan (0,96 $)" })).toBeEnabled());
    fireEvent.click(scene1().getByRole("button", { name: "Générer ce plan (0,96 $)" }));
    expect(await screen.findByText(/n'a pas encore d'image validée dans la bible/)).toBeInTheDocument();
  });

  it("générer enregistre d'abord, lance, puis suit le plan jusqu'à sa vidéo", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const appels = serveur({
      [`GET ${plan("rangement")}`]: [vide(), { corps: { plan: { etat: "en-cours" }, budget: BUDGET } }, { corps: { plan: { etat: "pret", fichier: "cinema/rangement.mp4" }, budget: { utilises: 1, plafond: 20 } } }],
      [`POST ${plan("rangement")}`]: [{ corps: { plan: { etat: "en-cours" }, budget: { utilises: 1, plafond: 20 } } }],
      [`GET ${bibleRoute}`]: [bibleVide()],
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
    const appels = serveur({ [`GET ${plan("rangement")}`]: [vide()], [`GET ${bibleRoute}`]: [bibleVide()] });
    render(<Banc cinema={avecPortrait()} enregistrer={async () => false} />);
    await waitFor(() => expect(scene1().getByRole("button", { name: "Générer ce plan (0,96 $)" })).toBeEnabled());
    fireEvent.click(scene1().getByRole("button", { name: "Générer ce plan (0,96 $)" }));
    expect(await screen.findByText("Enregistrement impossible : rien n'a été lancé.")).toBeInTheDocument();
    expect(appels.mock.calls.every(([, options]) => options?.method !== "POST")).toBe(true);
  });

  it("Studio absent ou clé manquante : un seul message en haut, et les boutons grisés", async () => {
    serveur({
      [`GET ${plan("rangement")}`]: [{ statut: 412, corps: { erreur: "Aucune clé Gemini : ajoute-la dans les Réglages pour générer." } }],
      [`GET ${bibleRoute}`]: [bibleVide()],
    });
    render(<Banc cinema={avecPortrait()} />);
    const alerte = (await screen.findAllByRole("alert")).find((element) => element.closest(".serie") && !element.closest(".bloc"))!;
    expect(alerte).toHaveTextContent("Aucune clé Gemini");
    expect(within(alerte).getByRole("link", { name: "Ouvrir les Réglages" })).toHaveAttribute("href", "/setup/video");
    expect(scene1().getByRole("button", { name: "Générer ce plan (0,96 $)" })).toBeDisabled();
  });

  it("la bible visuelle liste les personnages, et génère une vue au clic", async () => {
    const reference = { id: "awa", type: "personnage", nom: "Awa", description: avecPortrait().personnages[0].description, fiche: { statut: "propose", vues: {}, journal: [] } };
    serveur({
      [`GET ${plan("rangement")}`]: [vide()],
      [`GET ${bibleRoute}`]: [{ corps: { references: [reference] } }, { corps: { references: [{ ...reference, fiche: { statut: "propose", vues: { "en-pied": { versions: [{ n: 1, fichier: "cinema/bible/awa/en-pied-v1.jpg", origine: "generee", creeeLe: null }], retenue: 1 } }, journal: [] } }] } }],
      [`POST ${bibleRoute}/awa/en-pied`]: [{ corps: { fichier: "cinema/bible/awa/en-pied-v1.jpg" } }],
    });
    render(<Banc cinema={serieSaya()} />);
    expect(await screen.findByRole("article", { name: "Personnage Awa" })).toBeInTheDocument();
    // En pied est la première vue d'un personnage (VUES_DU_TYPE) : son bouton Générer est le premier.
    fireEvent.click(within(screen.getByRole("article", { name: "Personnage Awa" })).getAllByRole("button", { name: /Générer/ })[0]);
    expect(await screen.findByRole("img", { name: "En pied, version 1" })).toBeInTheDocument();
  });

  it("choisir une autre prise recopie SA découpe dans la fiche locale (sinon le prochain enregistrement écraserait celle du serveur)", async () => {
    const serie = avecPortrait();
    serie.episodes[0].scenes[0].plans[0].fichier = "cinema/rangement/prise-1.mp4";
    serie.episodes[0].scenes[0].plans[0].decoupe = { debut: 1, fin: 7 };
    const prisesRoute = `${plan("rangement")}/prises`;
    serveur({
      [`GET ${plan("rangement")}`]: [{ corps: { plan: { etat: "pret", fichier: "cinema/rangement/prise-1.mp4" }, budget: BUDGET } }],
      [`GET ${bibleRoute}`]: [bibleVide()],
      [`GET ${prisesRoute}`]: [
        {
          corps: {
            prises: [
              { n: 1, fichier: "cinema/rangement/prise-1.mp4", retenue: true, presente: true, creeeLe: null },
              { n: 2, fichier: "cinema/rangement/prise-2.mp4", retenue: false, presente: true, creeeLe: null },
            ],
          },
        },
      ],
      [`POST ${prisesRoute}/2`]: [
        {
          corps: {
            prises: [
              { n: 1, fichier: "cinema/rangement/prise-1.mp4", retenue: false, presente: true, creeeLe: null },
              { n: 2, fichier: "cinema/rangement/prise-2.mp4", retenue: true, presente: true, creeeLe: null },
            ],
            // La prise 2 n'a pas de découpe propre : le plan ne doit plus en citer après ce choix.
            plan: { fichier: "cinema/rangement/prise-2.mp4" },
          },
        },
      ],
    });
    render(<Banc cinema={serie} />);
    expect(await screen.findByText("Ses prises (2)")).toBeInTheDocument();
    fireEvent.click(scene1().getByRole("button", { name: "Garder celle-ci" }));
    await waitFor(() => expect(ficheCourante.cinema?.episodes[0].scenes[0].plans[0].decoupe).toBeUndefined());
  });

  it("un plan neuf, pas encore enregistré, est « à écrire », pas en erreur", async () => {
    serveur({ [`GET ${plan("rangement")}`]: [vide()], [`GET ${bibleRoute}`]: [bibleVide()] });
    render(<Banc cinema={avecPortrait()} />);
    fireEvent.click(within(screen.getByRole("list", { name: "Plans de la scène 1" })).getByRole("button", { name: "Ajouter un plan" }));
    expect(await screen.findByRole("region", { name: "Plan 3" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(scene1().getByText("Écris d'abord ce qui se passe dans ce plan.")).toBeInTheDocument();
  });
});
