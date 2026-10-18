import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import FormulaireNouveauFilm from "./formulaire";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const fetchOriginal = global.fetch;
afterEach(() => {
  global.fetch = fetchOriginal;
  push.mockClear();
});

describe("Nouveau film (page pleine, plus un popup)", () => {
  it("affiche une vraie page avec un fil d'Ariane vers le dashboard, pas une fenêtre modale", () => {
    render(<FormulaireNouveauFilm />);
    expect(screen.getByRole("heading", { name: "Créer un film de marque" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Mes vidéos/ })).toHaveAttribute("href", "/dashboard");
  });

  it("le bouton de création reste désactivé sans nom", () => {
    render(<FormulaireNouveauFilm />);
    expect(screen.getByRole("button", { name: /Créer et continuer/ })).toBeDisabled();
  });

  it("crée le film et navigue vers son assistant", async () => {
    global.fetch = vi.fn(async () => Response.json({ id: "maison-saya" })) as typeof fetch;
    render(<FormulaireNouveauFilm />);
    await userEvent.type(screen.getByPlaceholderText("Maison Saya"), "Maison Saya");
    await userEvent.click(screen.getByRole("button", { name: /Créer et continuer/ }));
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/film/maison-saya/creer"));
  });

  it("une création refusée affiche l'erreur rendue par le serveur", async () => {
    global.fetch = vi.fn(async () => Response.json({ erreurs: ["Le nom est déjà pris."] }, { status: 409 })) as typeof fetch;
    render(<FormulaireNouveauFilm />);
    await userEvent.type(screen.getByPlaceholderText("Maison Saya"), "Maison Saya");
    await userEvent.click(screen.getByRole("button", { name: /Créer et continuer/ }));
    expect(await screen.findByText("Le nom est déjà pris.")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
