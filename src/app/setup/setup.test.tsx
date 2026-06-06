import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SetupPage from "./page";
import CGU from "../(legal)/cgu/page";

describe("Setup wizard (handoff shell)", () => {
  it("renders the wiz stepper + brand", async () => {
    const { container } = render(<SetupPage />);
    expect(container.querySelector('[data-wm-id="setup.progress"]')).not.toBeNull();
    expect(await screen.findByText("GEN MOTION")).toBeInTheDocument();
    // 4 stepper dots
    expect(container.querySelectorAll(".wiz-dot")).toHaveLength(4);
  });
});

describe("Legal page content", () => {
  it("CGU renders its document body", () => {
    render(<CGU />);
    expect(screen.getByRole("heading", { name: /Conditions Générales/i })).toBeInTheDocument();
  });
});
