import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { projetDeDepart } from "@/lib/formats/format-loader";
import EditeurDuFormat from "./editeur-du-format";

const fetchOriginal = global.fetch;
let envoyes: unknown[] = [];

beforeEach(() => {
  envoyes = [];
  global.fetch = vi.fn(async (_url: unknown, options?: RequestInit) => {
    const corps = JSON.parse(String(options?.body ?? "{}")) as { projet: unknown };
    envoyes.push(corps.projet);
    return new Response(JSON.stringify({ projet: corps.projet, erreurs: [], aEcrire: ["textes.fr.signature"] }), { status: 200 });
  }) as typeof fetch;
});
afterEach(() => {
  global.fetch = fetchOriginal;
});

function editeur() {
  const projet = projetDeDepart("explainer", "essai");
  return render(<EditeurDuFormat id="essai" initial={{ projet, erreurs: [], aEcrire: ["a", "b", "c"] }} />);
}

describe("l'éditeur d'un explainer", () => {
  it("dit combien de textes sont encore ceux de l'exemple", () => {
    editeur();
    expect(screen.getByRole("note")).toHaveTextContent("3 textes encore celui de l'exemple");
  });

  it("montre chaque scène, ses champs « À écrire », et l'exemple en gris", () => {
    editeur();
    expect(screen.getAllByRole("region", { name: /^Scène \d$/ })).toHaveLength(5);
    expect(screen.getByPlaceholderText("Exemple : Constaté le 16 octobre")).toHaveValue("");
    expect(screen.getAllByText("À écrire").length).toBeGreaterThan(5);
  });

  it("ajoute une scène, puis l'enregistre toute seule après la pause de saisie", async () => {
    const utilisateur = userEvent.setup();
    editeur();
    await utilisateur.click(screen.getByRole("button", { name: "Ajouter une scène" }));
    expect(screen.getAllByRole("region", { name: /^Scène \d$/ })).toHaveLength(6);
    expect(screen.getByRole("status", { name: "" })).toBeTruthy();
    await waitFor(() => expect(envoyes).toHaveLength(1), { timeout: 3000 });
    const envoye = envoyes[0] as { spec: { scenes: { id: string }[] } };
    expect(envoye.spec.scenes.map((s) => s.id).at(-1)).toBe("lecon");
  });

  it("change le visuel d'une scène : ses champs suivent", async () => {
    const utilisateur = userEvent.setup();
    editeur();
    const premiere = screen.getAllByRole("region", { name: /^Scène \d$/ })[0]!;
    const choix = premiere.querySelector("select")!;
    await utilisateur.selectOptions(choix, "tampon");
    expect(premiere).toHaveTextContent("Scène 1 · Un tampon sur un objet");
    expect(premiere).toHaveTextContent("Le mot du tampon");
  });
});
