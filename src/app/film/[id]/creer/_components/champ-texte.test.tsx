import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ChampTexte from "./champ-texte";

describe("ChampTexte", () => {
  it("une réponse encore égale à l'exemple : case vide, exemple en indice, signalée « À écrire »", () => {
    render(<ChampTexte question="Ta promesse" exemple="La promesse." valeur="La promesse." onChange={() => {}} max={60} />);
    const champ = screen.getByLabelText("Ta promesse");
    expect(champ).toHaveValue("");
    expect(champ).toHaveAttribute("placeholder", "Exemple : La promesse.");
    expect(screen.getByText("À écrire")).toBeInTheDocument();
  });

  it("transmet ce qu'on tape, et une case vidée retrouve l'exemple", () => {
    const onChange = vi.fn();
    render(<ChampTexte question="Ta promesse" exemple="La promesse." valeur="Livré demain" onChange={onChange} />);
    const champ = screen.getByLabelText("Ta promesse");
    expect(champ).toHaveValue("Livré demain");
    expect(screen.queryByText("À écrire")).not.toBeInTheDocument();
    fireEvent.change(champ, { target: { value: "Livré ce soir" } });
    expect(onChange).toHaveBeenLastCalledWith("Livré ce soir");
    fireEvent.change(champ, { target: { value: "   " } });
    expect(onChange).toHaveBeenLastCalledWith("La promesse.");
  });

  it("signale un texte trop long sans le couper", () => {
    render(<ChampTexte question="Mot" exemple="Ex." valeur="Beaucoup trop long" onChange={() => {}} max={5} />);
    expect(screen.getByLabelText("Mot")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("18 / 5")).toBeInTheDocument();
  });

  it("une valeur proposée depuis le site, pas encore retouchée, porte « Proposé, à vérifier »", () => {
    render(<ChampTexte question="Q" exemple="Ex." valeur="Lu sur le site" propose onChange={() => {}} />);
    expect(screen.getByText("Proposé, à vérifier")).toBeInTheDocument();
  });

  it("sous un texte déjà écrit, montre la proposition du site et l'utilise d'un clic", () => {
    const onChange = vi.fn();
    const { rerender } = render(<ChampTexte question="Le constat" exemple="Ex." valeur="Un constat" suggestion="Les parfums naturels sont rares." onChange={onChange} />);
    expect(screen.getByText("Les parfums naturels sont rares.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Utiliser la proposition pour « Le constat »/ }));
    expect(onChange).toHaveBeenLastCalledWith("Les parfums naturels sont rares.");
    rerender(<ChampTexte question="Le constat" exemple="Ex." valeur="Les parfums naturels sont rares." suggestion="Les parfums naturels sont rares." onChange={onChange} />);
    expect(screen.queryByRole("button", { name: /Utiliser/ })).not.toBeInTheDocument();
  });
});
