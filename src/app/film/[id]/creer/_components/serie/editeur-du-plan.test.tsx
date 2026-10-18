import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { serieSaya } from "../../../../../../../remotion/film/cinema/serie-exemple.test-utils";
import type { CinemaDuFilm, PlanDeCinema } from "../../../../../../../remotion/film/cinema/types";
import EditeurDuPlan from "./editeur-du-plan";

/** Comme use-fiche-du-film : la copie change, l'éditeur se relit dessus. */
function Banc({ depart }: { depart: CinemaDuFilm }) {
  const [cinema, setCinema] = useState(depart);
  const modifierLePlan = (changement: (p: PlanDeCinema) => void) => {
    const copie = structuredClone(cinema);
    changement(copie.episodes[0].scenes[0].plans[1]);
    setCinema(copie);
  };
  return (
    <EditeurDuPlan
      filmId="saya"
      cinema={cinema}
      scene={cinema.episodes[0].scenes[0]}
      plan={cinema.episodes[0].scenes[0].plans[1]} // "flacon" : sans personnage, sans référence.
      numero={2}
      suivi={undefined}
      version={0}
      blocage={null}
      references={null}
      modifierLePlan={modifierLePlan}
      modifierLaSerie={vi.fn()}
      onGenerer={vi.fn()}
      onRafraichir={vi.fn()}
      onRetirer={vi.fn()}
    />
  );
}

describe("EditeurDuPlan — fournisseur (Veo / Seedance)", () => {
  it("Veo par défaut : prix affiché, bouton Veo enfoncé", () => {
    render(<Banc depart={serieSaya()} />);
    expect(screen.getByRole("button", { name: "Veo" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Seedance" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: /Générer ce plan/ })).toHaveTextContent("0,64 $");
    expect(screen.getByText(/Veo Lite :/)).toBeInTheDocument();
  });

  it("choisir Seedance pose plan.fournisseur, sans prix fixe affiché", () => {
    render(<Banc depart={serieSaya()} />);
    fireEvent.click(screen.getByRole("button", { name: "Seedance" }));
    expect(screen.getByRole("button", { name: "Seedance" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Générer ce plan/ })).not.toHaveTextContent("$");
    expect(screen.getByText(/facturé au token chez fal\.ai/)).toBeInTheDocument();
  });

  it("revenir à Veo retire plan.fournisseur", () => {
    const depart = serieSaya();
    depart.episodes[0].scenes[0].plans[1].fournisseur = "seedance";
    render(<Banc depart={depart} />);
    expect(screen.getByRole("button", { name: "Seedance" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Veo" }));
    expect(screen.getByRole("button", { name: "Veo" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Générer ce plan/ })).toHaveTextContent("$");
  });
});
