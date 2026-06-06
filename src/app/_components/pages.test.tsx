import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import About from "../about/page";
import Download from "../download/page";

describe("Secondary pages (handoff shell)", () => {
  it("About renders hero, principles + enterprise band", () => {
    const { container } = render(<About />);
    expect(screen.getByText(/Le motion design produit/i)).toBeInTheDocument();
    expect(screen.getByText("Local-first")).toBeInTheDocument();
    expect(screen.getByText("Frame-accurate")).toBeInTheDocument();
    expect(container.querySelector('[data-wm-id="about.enterprise"]')).not.toBeNull();
  });

  it("Download renders hero, specs + studio band", () => {
    const { container } = render(<Download />);
    expect(screen.getByText(/Installez GEN MOTION/i)).toBeInTheDocument();
    expect(screen.getByText("Configuration requise")).toBeInTheDocument();
    expect(screen.getByText(/Débloquez les outils pro/i)).toBeInTheDocument();
    expect(container.querySelector('[data-wm-id="download.studio"]')).not.toBeNull();
  });

  it("both share the page chrome (nav + footer)", () => {
    const { container } = render(<About />);
    expect(container.querySelector('[data-wm-id="page.nav"]')).not.toBeNull();
    expect(container.querySelector('[data-wm-id="page.footer"]')).not.toBeNull();
  });
});
