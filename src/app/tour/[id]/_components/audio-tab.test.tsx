import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AudioTab from "./audio-tab";
import type { AudioTrack } from "./music-library";

const TRACKS: AudioTrack[] = [
  { id: "a", originalName: "Lofi.mp3", filename: "a.mp3", sizeBytes: 2 * 1024 * 1024, durationSec: 102, uploadedAt: "" },
];

function props(extra: Record<string, unknown> = {}) {
  return {
    tracks: TRACKS,
    bgMusicId: undefined,
    onBgMusicChange: vi.fn(),
    onTracksChanged: vi.fn(),
    tourBgMusic: undefined,
    bgMusicVolume: 0.18,
    voVolume: 1,
    onVolumesChange: vi.fn(),
    ...extra,
  };
}

describe("AudioTab (handoff layout)", () => {
  it("renders the library + mix card with both volume sliders", () => {
    render(<AudioTab {...props()} />);
    expect(screen.getByText("Musique de fond")).toBeInTheDocument();
    expect(screen.getByText("Mixage")).toBeInTheDocument();
    expect(screen.getByText("Lofi.mp3")).toBeInTheDocument();
    expect(screen.getByLabelText("Volume musique")).toHaveValue("0.18");
    expect(screen.getByLabelText("Volume voix off")).toHaveValue("1");
  });

  it("updates music volume, keeping VO volume", () => {
    const onVolumesChange = vi.fn();
    render(<AudioTab {...props({ onVolumesChange })} />);
    fireEvent.change(screen.getByLabelText("Volume musique"), { target: { value: "0.5" } });
    expect(onVolumesChange).toHaveBeenCalledWith(0.5, 1);
  });

  it("selects a library track", () => {
    const onBgMusicChange = vi.fn();
    render(<AudioTab {...props({ onBgMusicChange })} />);
    fireEvent.click(screen.getByText("Lofi.mp3"));
    expect(onBgMusicChange).toHaveBeenCalledWith("a");
  });
});
