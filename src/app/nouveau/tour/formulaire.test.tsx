import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import FormulaireNouveauTour from "./formulaire";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const fetchOriginal = global.fetch;
afterEach(() => {
  global.fetch = fetchOriginal;
  push.mockClear();
});

describe("Nouveau tour (page pleine, plus un popup)", () => {
  it("affiche une vraie page avec un fil d'Ariane vers le dashboard, pas une fenêtre modale", () => {
    render(<FormulaireNouveauTour />);
    expect(screen.getByRole("heading", { name: "Créer un tour" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Mes vidéos/ })).toHaveAttribute("href", "/dashboard");
  });

  it("refuse une URL invalide pour un tour web", async () => {
    render(<FormulaireNouveauTour />);
    await userEvent.type(screen.getByPlaceholderText("Mon projet · Landing"), "Mon projet");
    const url = screen.getByPlaceholderText("https://mon-app.com");
    await userEvent.clear(url);
    await userEvent.type(url, "pas-une-url");
    await userEvent.click(screen.getByRole("button", { name: /Créer le tour/ }));
    expect(await screen.findByText(/Donne l'URL de ton app/)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("crée le tour et navigue vers son éditeur", async () => {
    // 1er appel : la vérification « existe déjà ? » (GET, 404 = libre). 2e appel : le PUT de création.
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(Response.json({ ok: true })) as typeof fetch;
    render(<FormulaireNouveauTour />);
    await userEvent.type(screen.getByPlaceholderText("Mon projet · Landing"), "Mon projet");
    const url = screen.getByPlaceholderText("https://mon-app.com");
    await userEvent.clear(url);
    await userEvent.type(url, "https://mon-app.com");
    await userEvent.click(screen.getByRole("button", { name: /Créer le tour/ }));
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/tour/mon-projet"));
  });
});
