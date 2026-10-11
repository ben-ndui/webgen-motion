import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ChoixDeCases from "./choix-de-cases";

const LANGUES = [
  { valeur: "fr", libelle: "Français" },
  { valeur: "en", libelle: "Anglais" },
];

describe("ChoixDeCases", () => {
  it("en choix multiple, coche et décoche, mais garde toujours au moins une case", () => {
    const onChange = vi.fn();
    const { rerender } = render(<ChoixDeCases titre="Langues" multiple options={LANGUES} valeurs={["fr"]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /Anglais/ }));
    expect(onChange).toHaveBeenLastCalledWith(["fr", "en"]);
    onChange.mockClear();
    fireEvent.click(screen.getByRole("checkbox", { name: /Français/ }));
    expect(onChange).not.toHaveBeenCalled();
    rerender(<ChoixDeCases titre="Langues" multiple options={LANGUES} valeurs={["fr", "en"]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /Français/ }));
    expect(onChange).toHaveBeenLastCalledWith(["en"]);
  });

  it("en choix simple, remplace la sélection", () => {
    const onChange = vi.fn();
    render(<ChoixDeCases titre="Style" options={LANGUES} valeurs={["fr"]} onChange={onChange} />);
    expect(screen.getByRole("radio", { name: /Français/ })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: /Anglais/ }));
    expect(onChange).toHaveBeenLastCalledWith(["en"]);
  });
});
