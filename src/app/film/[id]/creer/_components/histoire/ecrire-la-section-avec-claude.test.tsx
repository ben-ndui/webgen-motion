import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FilmSpec } from "../../../../../../../remotion/film/spec";
import { ficheValide } from "../../../../../../lib/film-fixtures.test-utils";
import EcrireLaSectionAvecClaude from "./ecrire-la-section-avec-claude";

afterEach(() => vi.restoreAllMocks());

function repondre(statut: number, corps: object) {
  return new Response(JSON.stringify(corps), { status: statut, headers: { "Content-Type": "application/json" } });
}

function afficher(avantDeDemander = vi.fn(async () => true)) {
  const fiche = ficheValide();
  const modifier = vi.fn((changement: (copie: FilmSpec) => void) => changement(fiche));
  render(<EcrireLaSectionAvecClaude id="saya" langue="fr" section="bascule" avantDeDemander={avantDeDemander} modifier={modifier} />);
  fireEvent.click(screen.getByRole("button", { name: "Écrire avec Claude" }));
  return { fiche, modifier, avantDeDemander };
}

describe("Écrire une section avec Claude", () => {
  it("enregistre, envoie la consigne, montre la proposition, et ne pose rien avant « Garder »", async () => {
    const appel = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      repondre(200, { champs: { "bascule.constat": "Chercher un parfum sans chimie", "bascule.signature": "Des parfums qui vous ressemblent." }, aEcrireSoiMeme: ["bascule.chiffre"] }),
    );
    const { fiche, modifier, avantDeDemander } = afficher();
    fireEvent.change(screen.getByLabelText("Ce que tu veux de Claude pour cette section"), { target: { value: "plus chaleureux" } });
    fireEvent.click(screen.getByRole("button", { name: "Proposer" }));

    const proposition = await screen.findByRole("region", { name: "Proposition de Claude" });
    expect(within(proposition).getByText("Aujourd'hui")).toBeInTheDocument();
    expect(within(proposition).getByText("Chercher un parfum sans chimie")).toBeInTheDocument();
    expect(proposition).toHaveTextContent("Rien de proposé pour : Le chiffre (aucun chiffre vérifiable sur ton site). Ton texte actuel reste.");
    expect(avantDeDemander).toHaveBeenCalled();
    expect(JSON.parse(String((appel.mock.calls[0] as [string, RequestInit])[1].body))).toEqual({ langue: "fr", section: "bascule", consigne: "plus chaleureux", aEviter: [] });
    expect(modifier).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Garder" }));
    expect(fiche.textes.fr.bascule.constat).toBe("Chercher un parfum sans chimie");
    expect(fiche.textes.fr.bascule.signature).toBe("Des parfums qui vous ressemblent.");
  });

  it("« Une autre » écarte ce qui vient d'être proposé, avec la même consigne", async () => {
    const appel = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(repondre(200, { champs: { "bascule.constat": "Version A" }, aEcrireSoiMeme: [] }))
      .mockResolvedValueOnce(repondre(200, { champs: { "bascule.constat": "Version B" }, aEcrireSoiMeme: [] }));
    afficher();
    fireEvent.change(screen.getByLabelText("Ce que tu veux de Claude pour cette section"), { target: { value: "plus court" } });
    fireEvent.click(screen.getByRole("button", { name: "Proposer" }));
    fireEvent.click(await screen.findByRole("button", { name: "Une autre" }));
    expect(await screen.findByText("Version B")).toBeInTheDocument();
    expect(JSON.parse(String((appel.mock.calls[1] as [string, RequestInit])[1].body))).toMatchObject({ consigne: "plus court", aEviter: ["Version A"] });
  });

  it("sans clé Claude : le dit, avec un lien vers le bon réglage", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(repondre(412, { erreur: "Aucune clé Claude : ajoute-la dans les Réglages pour te faire aider." }));
    afficher();
    fireEvent.click(screen.getByRole("button", { name: "Proposer" }));
    const alerte = await screen.findByRole("alert");
    expect(within(alerte).getByRole("link", { name: "Ouvrir les Réglages" })).toHaveAttribute("href", "/setup/agent");
  });

  it("un enregistrement raté : rien n'est demandé à Claude, et c'est dit", async () => {
    const appel = vi.spyOn(globalThis, "fetch");
    afficher(vi.fn(async () => false));
    fireEvent.click(screen.getByRole("button", { name: "Proposer" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("rien n'a été demandé à Claude");
    expect(appel).not.toHaveBeenCalled();
  });
});
