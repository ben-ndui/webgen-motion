import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CaptureTab, { type CaptureState, type CapturedSection } from "./capture-tab";

function props(capture: CaptureState, extra: Record<string, unknown> = {}) {
  return {
    capture,
    captureFormat: "16:9" as const,
    tourId: "t",
    onCapture: vi.fn(),
    onSectionRecaptured: vi.fn(),
    ...extra,
  };
}

const SECTION: CapturedSection = {
  index: 1,
  categoryId: "branding",
  title: "Hero",
  mp4Url: "blob:x",
  durationSec: 8,
  sizeBytes: 1024 * 1024,
  frames: 240,
};

describe("CaptureTab (handoff layout)", () => {
  it("idle: shows the ready prompt + triggers capture", async () => {
    const onCapture = vi.fn();
    render(<CaptureTab {...props({ kind: "idle" }, { onCapture })} />);
    expect(screen.getByRole("heading", { name: "Prêt à filmer" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Capturer les sections/i }));
    expect(onCapture).toHaveBeenCalledOnce();
  });

  it("running: streams the dark phase panel + disables the button", () => {
    render(
      <CaptureTab
        {...props({
          kind: "running",
          progress: { phase: "Section 2/4 · Pipeline", sectionIdx: 2, totalSections: 4, sinceSec: 12 },
        })}
      />,
    );
    expect(screen.getByText("Capture en cours")).toBeInTheDocument();
    expect(screen.getByText(/Section 2\/4/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Capture en cours/i })).toBeDisabled();
  });

  it("ready: renders the section grid + done panel", () => {
    const { container } = render(
      <CaptureTab
        {...props({
          kind: "ready",
          sections: [SECTION],
          totalDurationSec: 8,
          totalSizeBytes: 1024 * 1024,
          captureWallTimeSec: 30,
        })}
      />,
    );
    expect(screen.getByText("Hero")).toBeInTheDocument();
    expect(screen.getByText(/1 section capturée/)).toBeInTheDocument();
    expect(screen.getByText("Capture terminée")).toBeInTheDocument();
    expect(container.querySelector("video")).not.toBeNull();
  });

  it("error: shows the failure message", () => {
    render(<CaptureTab {...props({ kind: "error", message: "boom" })} />);
    expect(screen.getByText("Capture échouée")).toBeInTheDocument();
    expect(screen.getByText("boom")).toBeInTheDocument();
  });
});
