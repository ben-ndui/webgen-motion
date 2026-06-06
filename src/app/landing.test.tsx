import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LandingPage from "./page";

/**
 * Landing smoke test — the portaged scroll-snap landing renders all five
 * sections with their content + tour-ability hooks. Guards against a
 * regression that drops a section, CTA, or data-wm-id during further
 * migration. (Reveals/observers are stubbed in vitest.setup.)
 */
describe("Landing", () => {
  it("renders the statement hero + primary CTAs", () => {
    render(<LandingPage />);
    expect(screen.getByText(/On capture votre/i)).toBeInTheDocument();
    expect(screen.getByText(/Vous obtenez un clip/i)).toBeInTheDocument();
    // download CTA appears in nav + hero + pricing + cta
    expect(
      screen.getAllByRole("link", { name: /Télécharger/i }).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("renders the 3 pipeline steps and both pricing tiers", () => {
    render(<LandingPage />);
    expect(screen.getByText("01 — Capture")).toBeInTheDocument();
    expect(screen.getByText("02 — Voix off")).toBeInTheDocument();
    expect(screen.getByText("03 — Compose")).toBeInTheDocument();
    expect(screen.getByText("Community")).toBeInTheDocument();
    expect(screen.getByText("Studio")).toBeInTheDocument();
    expect(screen.getByText("$49")).toBeInTheDocument();
  });

  it("keeps the surface data-wm-id hooks", () => {
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
