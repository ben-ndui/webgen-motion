import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { projetDeDepart } from "@/lib/formats/format-loader";
import EditeurDuFormat from "./editeur-du-format";

const fetchOriginal = global.fetch;
let envoyes: { spec: { objets: unknown[]; textes: { fr: { avantages: string[] }; en: { avantages: string[] } }; compteur: { total: number } } }[] = [];

beforeEach(() => {
  envoyes = [];
  global.fetch = vi.fn(async (_url: unknown, options?: RequestInit) => {
    const corps = JSON.parse(String(options?.body ?? "{}")) as { projet: (typeof envoyes)[number] };
    envoyes.push(corps.projet);
    return new Response(JSON.stringify({ projet: corps.projet, erreurs: [], aEcrire: [] }), { status: 200 });
  }) as typeof fetch;
});
afterEach(() => {
  global.fetch = fetchOriginal;
});

const editeur = () => render(<EditeurDuFormat id="essai" initial={{ projet: projetDeDepart("conte", "essai"), erreurs: [], aEcrire: [] }} />);

describe("l'éditeur d'un conte", () => {
  it("montre le héros, les objets, le compteur et l'histoire, l'exemple en gris", () => {
    editeur();
    expect(screen.getByRole("heading", { name: "Ce qui lui tombe dessus · 6" })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Le total, quand tout est tombé" })).toHaveValue(113);
    expect(screen.getByPlaceholderText("Exemple : Puis les offres sont tombées du ciel.")).toHaveValue("");
  });

  it("ajoute un avantage dans les deux langues, et l'enregistre tout seul", async () => {
    const utilisateur = userEvent.setup();
    editeur();
    await utilisateur.click(screen.getByRole("button", { name: "Ajouter un avantage" }));
    expect(screen.getByRole("heading", { name: "Ce que ton produit change · 4" })).toBeInTheDocument();
    await waitFor(() => expect(envoyes).toHaveLength(1), { timeout: 3000 });
    expect([envoyes[0]!.spec.textes.fr.avantages.length, envoyes[0]!.spec.textes.en.avantages.length]).toEqual([4, 4]);
    expect(screen.queryByRole("button", { name: "Ajouter un avantage" })).not.toBeInTheDocument();
  });

  it("signale un constat qui ne cite plus le total du compteur", async () => {
    const utilisateur = userEvent.setup();
    editeur();
    await utilisateur.type(screen.getByPlaceholderText("Exemple : 113 offres à lire."), "Des centaines d'offres.");
    expect(screen.getByRole("note", { name: "" })).toBeTruthy();
    expect(screen.getByText(/ne cite pas le total du compteur \(113\)/)).toBeInTheDocument();
  });

  it("ne descend jamais sous trois objets", async () => {
    const utilisateur = userEvent.setup();
    editeur();
    for (let i = 0; i < 3; i += 1) await utilisateur.click(screen.getAllByRole("button", { name: "Retirer" })[0]!);
    expect(screen.getByRole("heading", { name: "Ce qui lui tombe dessus · 3" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Retirer" })[0]).toBeDisabled();
  });
});
