import { describe, it, expect } from "vitest";
import { buildMatchPrompt } from "./match-prompt";
import type { TourEntry } from "@/lib/types/tour";

const tour = {
  id: "p",
  name: "Pitch officiel",
  description: "Démo 90s",
  estimatedSec: 90,
  startPath: "/",
  voiceMode: "narrative",
  narrativeScript: "[step:0]Bonjour. [step:2]Le hub.",
  steps: [
    { type: "section", categoryId: "branding", title: "GEN MOTION", dwellMs: 3200 },
    { type: "wait", dwellMs: 1200 },
    {
      type: "section",
      categoryId: "features",
      title: "Hub",
      goto: "/dashboard",
      dwellMs: 2200,
      hotspots: [{ t: 3, x: 0.05, y: 0.1, label: "Nouveau tour", zoom: 2.3, dwellSec: 1.4 }],
    },
  ],
} as unknown as TourEntry;

describe("buildMatchPrompt", () => {
  it("embeds the timeline, timings, gotos + zoom labels", () => {
    const p = buildMatchPrompt(tour);
    expect(p).toContain("Pitch officiel");
    expect(p).toContain("[step:0]");
    expect(p).toContain("[step:2]");
    expect(p).toContain("« GEN MOTION »");
    expect(p).toContain("zoom sur Nouveau tour");
    expect(p).toContain("/dashboard");
    expect(p).toContain("3.2s"); // dwellMs → seconds
    expect(p).toContain("~90s"); // target duration
  });

  it("includes the current narrative to resync", () => {
    const p = buildMatchPrompt(tour);
    expect(p).toContain("[step:0]Bonjour. [step:2]Le hub.");
  });

  it("asks for narrativeScript only as output", () => {
    expect(buildMatchPrompt(tour)).toMatch(/narrativeScript/);
  });
});
