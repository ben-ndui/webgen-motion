import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import FormulaireNouveauFormat from "./formulaire";

const FORMATS = [
  { nom: "explainer", libelle: "Explainer", pourQui: "Pour expliquer un sujet." },
  { nom: "karaoke", libelle: "Clip karaoké", pourQui: "Pour les artistes." },
];

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const fetchOriginal = global.fetch;
afterEach(() => {
  global.fetch = fetchOriginal;
  push.mockClear();
});

describe("Nouveau format (page pleine, plus un popup)", () => {
  it("affiche une vraie page avec un fil d'Ariane vers le dashboard, et la grille des formats ne s'écrase pas", () => {
    render(<FormulaireNouveauFormat formats={FORMATS} />);
    expect(screen.getByRole("heading", { name: "Choisir un format" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Mes vidéos/ })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByText("Explainer")).toBeInTheDocument();
    expect(screen.getByText("Clip karaoké")).toBeInTheDocument();
  });

  it("le bouton de création reste désactivé sans nom", () => {
    render(<FormulaireNouveauFormat formats={FORMATS} />);
    expect(screen.getByRole("button", { name: /Créer et ouvrir/ })).toBeDisabled();
  });

  it("crée le projet et navigue vers sa page", async () => {
    global.fetch = vi.fn(async () => Response.json({ id: "10-ans-le-clip" })) as typeof fetch;
    render(<FormulaireNouveauFormat formats={FORMATS} />);
    await userEvent.type(screen.getByPlaceholderText("10 ANS, le clip"), "10 ANS, le clip");
    await userEvent.click(screen.getByRole("button", { name: /Créer et ouvrir/ }));
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/format/10-ans-le-clip"));
  });
});
