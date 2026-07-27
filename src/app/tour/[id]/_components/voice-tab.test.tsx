import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { TourEntry } from "@/lib/types/tour";
import VoiceTab, { type VoState } from "./voice-tab";

function makeTour(): TourEntry {
  return {
    id: "t",
    name: "T",
    description: "",
    estimatedSec: 10,
    startPath: "/",
    voiceMode: "per-step",
    steps: [
      { type: "section", categoryId: "branding", title: "Hero", dwellMs: 2000, voiceover: "Bonjour" },
    ],
  } as TourEntry;
}

function props(extra: Record<string, unknown> = {}) {
  return {
    tour: makeTour(),
    voState: { kind: "idle" } as VoState,
    onGenerateVo: vi.fn(),
    onJumpToScript: vi.fn(),
    onTourChange: vi.fn(),
    onSaveTour: vi.fn(),
    saveStatus: "idle" as const,
    ...extra,
  };
}

describe("VoiceTab (handoff layout)", () => {
  it("renders the panel, mode toggle + generate action", () => {
    render(<VoiceTab {...props()} />);
    expect(screen.getByRole("heading", { name: "Voix off" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Per-step/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Narrative$/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Générer la voix off/i }).length).toBeGreaterThanOrEqual(1);
  });

  it("switches to narrative mode", async () => {
    const onTourChange = vi.fn();
    render(<VoiceTab {...props({ onTourChange })} />);
    await userEvent.click(screen.getByRole("button", { name: /^Narrative$/i }));
    expect(onTourChange).toHaveBeenCalled();
    expect(onTourChange.mock.calls.at(-1)![0]).toMatchObject({ voiceMode: "narrative" });
  });

  it("triggers generation", async () => {
    const onGenerateVo = vi.fn();
    render(<VoiceTab {...props({ onGenerateVo })} />);
    await userEvent.click(screen.getAllByRole("button", { name: /Générer la voix off/i })[0]);
    expect(onGenerateVo).toHaveBeenCalledOnce();
  });

  it("affiche le backend pinné (Google) et pas ElevenLabs en dur", () => {
    const tour = { ...makeTour(), voiceBackend: "google" as const };
    render(<VoiceTab {...props({ tour })} />);
    // Le kicker de la carte d'action reflète le backend effectif.
    expect(screen.getAllByText(/Google TTS/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/ElevenLabs TTS/i)).not.toBeInTheDocument();
  });
});
