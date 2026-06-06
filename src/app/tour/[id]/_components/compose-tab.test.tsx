import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { TourEntry } from "@/lib/types/tour";
import ComposeTab, { type ComposeState } from "./compose-tab";

function baseProps(overrides: Partial<Parameters<typeof ComposeTab>[0]> = {}) {
  const tour = {
    id: "t",
    name: "T",
    description: "",
    estimatedSec: 10,
    startPath: "/",
    composeStyle: "energetic",
    steps: [{ type: "section", categoryId: "branding", title: "Hero", dwellMs: 2000 }],
  } as TourEntry;
  return {
    tourId: "t",
    tour,
    onTourChange: vi.fn(),
    compose: { kind: "idle" } as ComposeState,
    captureSections: [{}] as never,
    voState: { kind: "idle" } as never,
    bgMusicId: undefined,
    tracks: [],
    bgMusicVolume: 0.18,
    voVolume: 1,
    onCompose: vi.fn(),
    ...overrides,
  };
}

describe("ComposeTab (handoff layout)", () => {
  it("renders presets + readiness checklist", () => {
    render(<ComposeTab {...baseProps()} />);
    for (const p of ["Sober", "Energetic", "Cinematic", "Glitch"]) {
      expect(screen.getByText(p)).toBeInTheDocument();
    }
    expect(screen.getByText("Prêt à composer ?")).toBeInTheDocument();
    expect(screen.getByText("Captures")).toBeInTheDocument();
  });

  it("selecting a preset updates composeStyle", async () => {
    const onTourChange = vi.fn();
    render(<ComposeTab {...baseProps({ onTourChange })} />);
    await userEvent.click(screen.getByText("Cinematic"));
    expect(onTourChange).toHaveBeenCalled();
    expect(onTourChange.mock.calls.at(-1)![0]).toMatchObject({ composeStyle: "cinematic" });
  });

  it("Composer maintenant triggers onCompose when capture is ready", async () => {
    const onCompose = vi.fn();
    render(<ComposeTab {...baseProps({ onCompose })} />);
    await userEvent.click(screen.getByRole("button", { name: /Composer maintenant/i }));
    expect(onCompose).toHaveBeenCalledOnce();
  });

  it("disables compose when there is no capture", () => {
    render(<ComposeTab {...baseProps({ captureSections: null })} />);
    expect(screen.getByRole("button", { name: /Composer maintenant/i })).toBeDisabled();
  });

  it("shows the final video when compose is ready", () => {
    const { container } = render(
      <ComposeTab
        {...baseProps({
          compose: { kind: "ready", finalUrl: "blob:x", sizeBytes: 25 * 1024 * 1024, captureWallTimeSec: 42 },
        })}
      />,
    );
    expect(container.querySelector("video")).not.toBeNull();
    expect(screen.getByText(/final\.mp4/)).toBeInTheDocument();
  });
});
