import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ficheDeDepart } from "@/lib/film-fiche-depart";
import EtapeMarque from "./etape-marque";

const FICHE = ficheDeDepart({ nom: "Saya", langues: ["fr"], formats: ["court"], direction: "editorial" });

describe("étape « Ta marque »", () => {
  it("montre le style choisi à la création, et permet d'en changer", () => {
    const modifier = vi.fn();
    render(<EtapeMarque id="saya" fiche={FICHE} modifier={modifier} deposer={async () => null} logoPresent={false} propositions={{}} medias={[]} />);
    expect(screen.getByRole("radio", { name: /Éditorial/ })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: /Nocturne/ }));
    const copie = structuredClone(FICHE);
    modifier.mock.calls.at(-1)![0](copie);
    expect(copie.direction).toBe("nocturne");
  });

  it("changer une couleur recalcule les accents lisibles", () => {
    const modifier = vi.fn();
    render(<EtapeMarque id="saya" fiche={FICHE} modifier={modifier} deposer={async () => null} logoPresent={false} propositions={{}} medias={[]} />);
    fireEvent.change(screen.getByLabelText("Couleur d'accent"), { target: { value: "#ffd600" } });
    const copie = structuredClone(FICHE);
    modifier.mock.calls.at(-1)![0](copie);
    expect(copie.marque.couleurs.accent).toBe("#FFD600");
    expect(copie.marque.couleurs.accentSurClair).not.toBe("#FFD600");
  });

  it("ajouter l'anglais et le format horizontal crée les vidéos manquantes sans toucher aux réglages existants", () => {
    const modifier = vi.fn();
    const fiche = structuredClone(FICHE);
    fiche.declinaisons[0]!.avecContact = false;
    render(<EtapeMarque id="saya" fiche={fiche} modifier={modifier} deposer={async () => null} logoPresent={false} propositions={{}} medias={[]} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /Anglais/ }));
    const copie = structuredClone(fiche);
    modifier.mock.calls.at(-1)![0](copie);
    expect(copie.declinaisons.map((d) => d.nom)).toEqual(["Court-FR", "Court-EN"]);
    expect(copie.declinaisons[0]!.avecContact).toBe(false);
    fireEvent.click(screen.getByRole("checkbox", { name: /Horizontal/ }));
    modifier.mock.calls.at(-1)![0](copie);
    expect(copie.declinaisons.map((d) => d.nom)).toEqual(["Film-FR", "Film-EN", "Court-FR", "Court-EN"]);
  });
});
