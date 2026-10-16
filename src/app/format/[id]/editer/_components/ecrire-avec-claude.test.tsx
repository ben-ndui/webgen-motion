import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import EcrireAvecClaude from "./ecrire-avec-claude";

const fetchOriginal = global.fetch;
afterEach(() => {
  global.fetch = fetchOriginal;
});

const PROPOSITION = {
  scenes: [{ id: "scene-1", mesures: 3, visuel: { type: "chiffre", picto: "document" } }],
  textes: { fr: { signature: "s", scenes: { "scene-1": { chapitre: "Le constat", sousTitre: "Un sur quatre", mots: { type: "chiffre", valeur: "1 sur 4" } } } }, en: { signature: "s", scenes: {} } },
};

async function remplir() {
  const utilisateur = userEvent.setup();
  await utilisateur.type(screen.getByRole("textbox", { name: "De quoi parle la vidéo ?" }), "Les offres fermées");
  await utilisateur.type(screen.getByRole("textbox", { name: /Tes notes/ }), "1 dossier sur 4 visait un poste fermé.");
  await utilisateur.click(screen.getByRole("button", { name: "Écrire avec Claude" }));
  return utilisateur;
}

describe("écrire un explainer avec Claude", () => {
  it("ne propose pas d'écrire sans sujet ni notes", () => {
    render(<EcrireAvecClaude id="essai" garder={() => {}} />);
    expect(screen.getByRole("button", { name: "Écrire avec Claude" })).toBeDisabled();
  });

  it("montre la proposition à relire, et ne la pose dans le projet qu'au geste « Garder »", async () => {
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ proposition: PROPOSITION }), { status: 200 })) as typeof fetch;
    const garder = vi.fn();
    render(<EcrireAvecClaude id="essai" garder={garder} />);
    const utilisateur = await remplir();
    expect(await screen.findByText("Le constat")).toBeInTheDocument();
    expect(screen.getByText(/1 sur 4 · Un sur quatre/)).toBeInTheDocument();
    expect(garder).not.toHaveBeenCalled();
    await utilisateur.click(screen.getByRole("button", { name: "Garder ces scènes" }));
    expect(garder).toHaveBeenCalledWith(PROPOSITION);
  });

  it("dit le refus du serveur, chiffre inventé compris", async () => {
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ erreur: "Claude a écrit 70000, absent de tes notes" }), { status: 502 })) as typeof fetch;
    render(<EcrireAvecClaude id="essai" garder={() => {}} />);
    await remplir();
    expect(await screen.findByRole("alert")).toHaveTextContent("70000, absent de tes notes");
  });
});
