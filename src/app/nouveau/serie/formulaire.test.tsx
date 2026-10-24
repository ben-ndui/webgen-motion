import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { cleDuTexteDeDepart } from "@/lib/cinema/bible/texte-de-depart";
import FormulaireNouvelleSerie from "./formulaire";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

afterEach(() => {
  vi.restoreAllMocks();
  push.mockClear();
  sessionStorage.clear();
});

describe("Nouvelle série (page pleine, dédiée)", () => {
  it("affiche une vraie page, avec un fil d'Ariane vers le dashboard", () => {
    render(<FormulaireNouvelleSerie />);
    expect(screen.getByRole("heading", { name: "Créer une série" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Mes vidéos/ })).toHaveAttribute("href", "/dashboard");
  });

  it("le bouton de création reste désactivé sans nom", () => {
    render(<FormulaireNouvelleSerie />);
    expect(screen.getByRole("button", { name: /Créer et ouvrir/ })).toBeDisabled();
  });

  it("crée le film avec des réglages fixes (pas de langues/formats/style à choisir) et renvoie direct sur l'étape Série", async () => {
    const appel = vi.fn(async () => Response.json({ id: "l-heritiere" }, { status: 201 }));
    vi.stubGlobal("fetch", appel);
    render(<FormulaireNouvelleSerie />);
    await userEvent.type(screen.getByPlaceholderText("L'héritière des deux couronnes"), "L'héritière");
    await userEvent.click(screen.getByRole("button", { name: /Créer et ouvrir/ }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/film/l-heritiere/creer?etape=serie"));
    const [, options] = appel.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(options.body as string)).toEqual({ nom: "L'héritière", langues: ["fr"], formats: ["court"], direction: "marque" });
    // Aucun document déposé : rien à transmettre à l'étape suivante.
    expect(sessionStorage.getItem(cleDuTexteDeDepart("l-heritiere"))).toBeNull();
  });

  it("déposer un .txt se lit directement dans le navigateur, sans appel réseau, et compte ses caractères", async () => {
    const appel = vi.fn();
    vi.stubGlobal("fetch", appel);
    render(<FormulaireNouvelleSerie />);
    const txt = new File(["Henrik est le frère perdu d'Awa."], "bible.txt", { type: "text/plain" });
    fireEvent.change(screen.getByLabelText("Déposer un document"), { target: { files: [txt] } });
    await screen.findByText("32 caractères prêts à importer.");
    expect(appel).not.toHaveBeenCalled();
  });

  it("déposer un PDF ou un Word passe par l'extraction serveur, et le texte suit la création dans sessionStorage", async () => {
    const documentRoute = "/api/motion/cinema/bible/document";
    const appel = vi.fn(async (url: string) => {
      if (url === documentRoute) return Response.json({ texte: "Henrik est le frère perdu d'Awa.", tronque: false });
      return Response.json({ id: "l-heritiere" }, { status: 201 });
    });
    vi.stubGlobal("fetch", appel);
    render(<FormulaireNouvelleSerie />);
    await userEvent.type(screen.getByPlaceholderText("L'héritière des deux couronnes"), "L'héritière");
    const pdf = new File(["%PDF-1.4 ..."], "bible.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Déposer un document"), { target: { files: [pdf] } });
    await screen.findByText(/caractères prêts à importer/);
    await userEvent.click(screen.getByRole("button", { name: /Créer et ouvrir/ }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/film/l-heritiere/creer?etape=serie"));
    expect(sessionStorage.getItem(cleDuTexteDeDepart("l-heritiere"))).toBe("Henrik est le frère perdu d'Awa.");
  });

  it("un document trop gros est refusé avant tout envoi réseau", () => {
    const appel = vi.fn();
    vi.stubGlobal("fetch", appel);
    render(<FormulaireNouvelleSerie />);
    const gros = new File([new Uint8Array(21 * 1024 * 1024)], "bible.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Déposer un document"), { target: { files: [gros] } });
    expect(screen.getByRole("alert")).toHaveTextContent("Fichier trop gros");
    expect(appel).not.toHaveBeenCalled();
  });

  it("dit l'échec du serveur sans naviguer, si la création rate", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ erreurs: ["Un film porte déjà ce nom."] }, { status: 409 })));
    render(<FormulaireNouvelleSerie />);
    await userEvent.type(screen.getByPlaceholderText("L'héritière des deux couronnes"), "L'héritière");
    await userEvent.click(screen.getByRole("button", { name: /Créer et ouvrir/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Un film porte déjà ce nom.");
    expect(push).not.toHaveBeenCalled();
  });
});
