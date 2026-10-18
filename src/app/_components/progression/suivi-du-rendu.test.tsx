import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import BarreDeProgression from "./barre-de-progression";
import SuiviDuRendu from "./suivi-du-rendu";

const MAINTENANT = new Date("2026-10-18T03:00:00Z").getTime();
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(MAINTENANT);
});
afterEach(() => vi.useRealTimers());

const enCours = (etat: Partial<Parameters<typeof SuiviDuRendu>[0]["etat"]>) => ({
  type: "en-cours" as const, label: "", frames: 0, total: 0, restant: null, debut: MAINTENANT, ...etat,
});

describe("le suivi d'un rendu", () => {
  it("montre l'étape active, les faites, le libellé humain, le temps restant et la durée estimée", () => {
    const debut = MAINTENANT - 72_000;
    render(<SuiviDuRendu etat={enCours({ etape: "images", label: "Image 454 sur 810", frames: 454, total: 810, restant: 80, debut })} />);
    expect(screen.getByText("Images").closest("li")).toHaveAttribute("aria-current", "step");
    expect(screen.getByText("Préparation").closest("li")).toHaveAttribute("data-etat", "faite");
    expect(screen.getByText("Encodage").closest("li")).toHaveAttribute("data-etat", "a-venir");
    expect(screen.getByText("Image 454 sur 810")).toBeInTheDocument();
    expect(screen.getByText("encore ~1 min 20")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "56");
    // Remotion n'estime que les images : l'écran ne fait pas passer ça pour le total.
    expect(screen.getByText("1 min 12 écoulées · durée estimée ~2 min 32 + encodage")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Rendu : Images");
  });

  it("le temps écoulé avance tout seul", () => {
    render(<SuiviDuRendu etat={enCours({ etape: "preparation", label: "Préparation du rendu…" })} />);
    expect(screen.getByText("Démarrage…")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.getByText("1 s écoulée")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(4_000));
    expect(screen.getByText("5 s écoulées")).toBeInTheDocument();
  });

  it("sans pourcentage connu (préparation), la barre patiente au lieu d'inventer un chiffre", () => {
    render(<SuiviDuRendu etat={enCours({ etape: "preparation", label: "Préparation de la composition · 40 %" })} />);
    const barre = screen.getByRole("progressbar");
    expect(barre).toHaveAttribute("data-en-attente", "true");
    expect(barre).not.toHaveAttribute("aria-valuenow");
  });

  it("à l'encodage, sans estimation de Remotion : le pourcentage, pas de durée inventée", () => {
    render(<SuiviDuRendu etat={enCours({ etape: "encodage", label: "Encodage de la vidéo · 405 sur 810", frames: 405, total: 810 })} />);
    expect(screen.getByText("50 %")).toBeInTheDocument();
    expect(screen.queryByText(/durée estimée/)).not.toBeInTheDocument();
  });

  it("un flux sans étapes (l'écoute des paroles) n'affiche pas de frise", () => {
    render(<SuiviDuRendu etat={enCours({ label: "Écoute fine : 40 %" })} />);
    expect(screen.queryByRole("list", { name: "Étapes du rendu" })).not.toBeInTheDocument();
    expect(screen.getByText("Écoute fine : 40 %", { selector: ".suivi-libelle" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Écoute fine : 40 %");
  });
});

describe("la barre de progression", () => {
  it("borne la valeur entre 0 et 100 %", () => {
    render(<BarreDeProgression valeur={1.7} nom="x" />);
    expect(screen.getByRole("progressbar", { name: "x" })).toHaveAttribute("aria-valuenow", "100");
  });

  it("NaN (un total à zéro) patiente au lieu d'afficher « NaN % »", () => {
    render(<BarreDeProgression valeur={Number.NaN} nom="y" />);
    const barre = screen.getByRole("progressbar", { name: "y" });
    expect(barre).not.toHaveAttribute("aria-valuenow");
    expect(barre).toHaveAttribute("data-en-attente", "true");
  });
});
