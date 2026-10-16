import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import LandingPage from "../../page";

function simulerLaPreference(moinsDAnimations: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: moinsDAnimations, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
}

describe("Accueil (direction B)", () => {
  beforeEach(() => {
    simulerLaPreference(false);
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("ouvre sur la promesse et le vrai film de Smooth & Design", () => {
    const { container } = render(<LandingPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Ton site devient un film.");
    const film = container.querySelector('[data-wm-id="landing.hero.film"] video');
    expect(film?.getAttribute("src")).toBe("/films/smooth-and-design-16x9.mp4");
    expect(film?.getAttribute("poster")).toBe("/films/smooth-and-design-16x9.jpg");
  });

  it("garde une action principale (télécharger) en nav, au prix et en fin de page", () => {
    render(<LandingPage />);
    expect(screen.getAllByRole("link", { name: /Télécharger/i }).length).toBeGreaterThanOrEqual(3);
  });

  it("conserve les repères data-wm-id de chaque surface", () => {
    const { container } = render(<LandingPage />);
    for (const id of ["landing.nav", "landing.hero", "landing.fabrique", "landing.comment", "landing.pricing", "landing.cta", "landing.footer"]) {
      expect(container.querySelector(`[data-wm-id="${id}"]`), id).not.toBeNull();
    }
  });

  it("chaque point de la navigation latérale vise une section qui existe", () => {
    const { container } = render(<LandingPage />);
    for (const id of ["hero", "fabrique", "comment", "confiance", "prix", "commencer"]) {
      expect(container.querySelector(`section#${id}`), id).not.toBeNull();
    }
  });

  it("Studio ne promet que ce que le code réserve vraiment à Studio", () => {
    const { container } = render(<LandingPage />);
    const studio = container.querySelector('[data-wm-id="landing.pricing.studio"]')?.textContent ?? "";
    expect(studio).toContain("199");
    expect(studio).toContain("Cadres 3D");
    expect(studio).toContain("DaVinci Resolve");
    for (const promesseNonTenue of ["Cinematic", "Glitch", "filigrane", "watermark", "bibliothèque de musique"]) {
      expect(studio).not.toContain(promesseNonTenue);
    }
  });

  it("l'abonnement se trouve : le bouton Studio mène droit aux trois offres, et l'annuel n'est pas « sans engagement »", () => {
    const { container } = render(<LandingPage />);
    const studio = container.querySelector('[data-wm-id="landing.pricing.studio"]');
    expect(studio?.textContent).toContain("15 € par mois sans engagement, ou 120 € par an");
    expect(container.querySelector('[data-wm-id="landing.pricing.studio-cta"]')).toHaveAttribute("href", "/download#studio");
  });

  it("la vidéo joue seule, sans le son, et propose de le remettre", () => {
    const { container } = render(<LandingPage />);
    const film = container.querySelector<HTMLVideoElement>('[data-wm-id="landing.hero.film"] video');
    expect(film?.muted).toBe(true);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(screen.getAllByRole("button", { name: "Mettre le son" }).length).toBeGreaterThan(0);
  });

  it("si le visiteur demande moins d'animations, la vidéo reste sur son affiche avec ses commandes", () => {
    simulerLaPreference(true);
    const { container } = render(<LandingPage />);
    const film = container.querySelector<HTMLVideoElement>('[data-wm-id="landing.hero.film"] video');
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    expect(film?.hasAttribute("controls")).toBe(true);
    expect(screen.queryByRole("button", { name: "Mettre le son" })).toBeNull();
  });
});
