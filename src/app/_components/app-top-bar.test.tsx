import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AppTopBar from "./app-top-bar";

describe("AppTopBar", () => {
  it("le fil mène aux pages parentes, la page courante n'est pas un lien", () => {
    render(<AppTopBar fil={[{ libelle: "Films", href: "/dashboard#films" }, { libelle: "kotizo", href: "/film/kotizo" }]} />);
    expect(screen.getByRole("link", { name: "Films" })).toHaveAttribute("href", "/dashboard#films");
    expect(screen.queryByRole("link", { name: "kotizo" })).not.toBeInTheDocument();
    expect(screen.getByText("kotizo")).toBeInTheDocument();
  });

  it("Aide et Retour gardent un nom accessible même quand leur libellé est masqué", () => {
    render(<AppTopBar fil={[{ libelle: "Tours" }]} retour="/ailleurs" />);
    expect(screen.getByRole("link", { name: "Aide" })).toHaveAttribute("href", "/help");
    expect(screen.getByRole("link", { name: "Retour" })).toHaveAttribute("href", "/ailleurs");
  });

  it("affiche la pastille et les actions de la page seulement si on les donne", () => {
    const { rerender } = render(<AppTopBar fil={[{ libelle: "x" }]} />);
    expect(screen.queryByText("9:16")).not.toBeInTheDocument();
    rerender(<AppTopBar fil={[{ libelle: "x" }]} meta={<span>9:16</span>} actions={<button type="button">Sauvegarder</button>} />);
    expect(screen.getByText("9:16")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sauvegarder" })).toBeInTheDocument();
  });
});
