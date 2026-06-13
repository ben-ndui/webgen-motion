import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LandingPage from "./page";

/**
 * Landing smoke test — la landing v3 « vidéos produit as code » rend
 * son hero, ses 4 étapes pipeline, ses tiers de pricing et les hooks
 * data-wm-id de chaque surface. Garde contre une régression qui
 * larguerait une section / CTA pendant les itérations design.
 * (Reveals/observers sont stubbés dans vitest.setup.)
 */
describe("Landing", () => {
  it("rend le hero « écrites comme du code » + le CTA download", () => {
    render(<LandingPage />);
    expect(screen.getByText(/écrites comme du/i)).toBeInTheDocument();
    expect(screen.getByText(/rejoue ton produit/i)).toBeInTheDocument();
    // CTA download court ("Télécharger") en nav + pricing community.
    expect(
      screen.getAllByRole("link", { name: /Télécharger/i }).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("rend les 4 étapes du pipeline + les tiers de pricing", () => {
    const { container } = render(<LandingPage />);
    expect(screen.getByText("01 — Script")).toBeInTheDocument();
    expect(screen.getByText("02 — Capture")).toBeInTheDocument();
    expect(screen.getByText("03 — Voix off")).toBeInTheDocument();
    expect(screen.getByText("04 — Edit Engine + Compose")).toBeInTheDocument();
    // Trois tiers + le prix Lifetime Studio (héros, présent à plusieurs endroits).
    expect(screen.getAllByText(/199/).length).toBeGreaterThan(0);
    for (const tier of [
      "landing.pricing.community",
      "landing.pricing.studio",
      "landing.pricing.enterprise",
    ]) {
      expect(container.querySelector(`[data-wm-id="${tier}"]`)).not.toBeNull();
    }
  });

  it("conserve les hooks data-wm-id de chaque surface", () => {
    const { container } = render(<LandingPage />);
    for (const id of [
      "landing.nav",
      "landing.hero",
      "landing.demo",
      "landing.pipeline",
      "landing.pricing",
      "landing.cta",
      "landing.footer",
    ]) {
      expect(container.querySelector(`[data-wm-id="${id}"]`)).not.toBeNull();
    }
  });
});
