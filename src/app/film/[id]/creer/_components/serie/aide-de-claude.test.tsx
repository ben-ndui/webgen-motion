import { fireEvent, render, screen, within } from "@testing-library/react";
import { useRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Proposition } from "@/lib/cinema/assistant/types";
import { serieSaya } from "../../../../../../../remotion/film/cinema/serie-exemple.test-utils";
import type { CinemaDuFilm } from "../../../../../../../remotion/film/cinema/types";
import AideDeClaude from "./aide-de-claude";
import { useAssistant } from "./use-assistant";

// Comme l'assistant de création : la modification est appliquée tout de suite sur une copie.
function Banc({ depart, onSerie }: { depart: CinemaDuFilm; onSerie: (c: CinemaDuFilm) => void }) {
  // La ref est modifiée tout de suite (comme use-fiche-du-film), l'état sert à l'affichage.
  const derniere = useRef(depart);
  const [serie, setSerie] = useState(depart);
  const modifierLaSerie = (changement: (c: CinemaDuFilm) => void) => {
    const copie = structuredClone(derniere.current);
    changement(copie);
    derniere.current = copie;
    setSerie(copie);
    onSerie(copie);
  };
  const assistant = useAssistant("saya", serie, modifierLaSerie);
  return (
    <AideDeClaude
      cinema={serie}
      gestes={[{ libelle: "Écrire la réplique avec Claude", demande: { type: "replique", episode: "ep1", plan: "rangement" } }]}
      etat={assistant.etat}
      demander={(d) => void assistant.demander(d)}
      garder={() => assistant.garder()}
      refuser={assistant.refuser}
        autre={assistant.autre}
    />
  );
}

const PROPOSITION: Proposition = { type: "replique", plan: "rangement", replique: { personnage: "awa", texte: "Ma grand-mère cueillait l'hibiscus." } };

function repondre(statut: number, corps: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(corps), { status: statut }));
}

function afficher(depart = serieSaya()) {
  const onSerie = vi.fn();
  render(<Banc depart={depart} onSerie={onSerie} />);
  fireEvent.click(screen.getByRole("button", { name: "Écrire la réplique avec Claude" }));
  return onSerie;
}

describe("AideDeClaude", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("montre la proposition sans rien changer, puis la pose quand on la garde", async () => {
    const appel = repondre(200, { proposition: PROPOSITION });
    vi.stubGlobal("fetch", appel);
    const onSerie = afficher();
    const proposition = await screen.findByRole("region", { name: "Proposition de Claude" });
    expect(proposition).toHaveTextContent("Awa : « Ma grand-mère cueillait l'hibiscus. »");
    expect(onSerie).not.toHaveBeenCalled();
    // Claude reçoit la série telle qu'elle est à l'écran.
    expect(JSON.parse((appel.mock.calls[0] as unknown as [string, RequestInit])[1].body as string).cinema.episodes[0].id).toBe("ep1");

    fireEvent.click(screen.getByRole("button", { name: "Garder" }));
    const serie = onSerie.mock.calls[0][0] as CinemaDuFilm;
    expect(serie.episodes[0].scenes[0].plans[0].replique).toEqual(PROPOSITION.type === "replique" && PROPOSITION.replique);
    expect(screen.queryByRole("region", { name: "Proposition de Claude" })).toBeNull();
  });

  it("« Non merci » ne touche à rien", async () => {
    vi.stubGlobal("fetch", repondre(200, { proposition: PROPOSITION }));
    const onSerie = afficher();
    await screen.findByRole("region", { name: "Proposition de Claude" });
    fireEvent.click(screen.getByRole("button", { name: "Non merci" }));
    expect(onSerie).not.toHaveBeenCalled();
    expect(screen.queryByRole("region", { name: "Proposition de Claude" })).toBeNull();
  });

  it("« Autre proposition » redemande en écartant ce qui vient d'être proposé", async () => {
    const appel = repondre(200, { proposition: PROPOSITION });
    vi.stubGlobal("fetch", appel);
    afficher();
    await screen.findByRole("region", { name: "Proposition de Claude" });
    fireEvent.click(screen.getByRole("button", { name: "Autre proposition" }));
    await screen.findByRole("region", { name: "Proposition de Claude" });
    expect(appel).toHaveBeenCalledTimes(2);
    // La 2e demande écarte la réplique déjà proposée.
    const deuxieme = JSON.parse((appel.mock.calls[1] as unknown as [string, RequestInit])[1].body as string);
    expect(deuxieme.demande.aEviter).toEqual(["Ma grand-mère cueillait l'hibiscus."]);
  });

  it("affiche la phrase du serveur quand Claude ne peut pas répondre", async () => {
    vi.stubGlobal("fetch", repondre(412, { erreur: "Aucune clé Claude : ajoute-la dans les Réglages pour te faire aider." }));
    afficher();
    const alerte = await screen.findByRole("alert");
    expect(alerte).toHaveTextContent("Aucune clé Claude");
    // un clic mène à la page qui règle Claude, pas à celle de la voix off
    expect(within(alerte).getByRole("link", { name: "Ouvrir les Réglages" })).toHaveAttribute("href", "/setup/agent");
  });

  it("refuse de garder une réplique si son personnage a quitté le plan entre-temps", async () => {
    const depart = serieSaya();
    depart.episodes[0].scenes[0].plans[0].personnages = [];
    vi.stubGlobal("fetch", repondre(200, { proposition: PROPOSITION }));
    afficher(depart);
    await screen.findByRole("region", { name: "Proposition de Claude" });
    fireEvent.click(screen.getByRole("button", { name: "Garder" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("plus à l'image");
  });
});
