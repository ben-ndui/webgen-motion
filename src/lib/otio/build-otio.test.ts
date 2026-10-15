import { describe, expect, it } from "vitest";

import { type OtioExportInputs, buildOtioTimeline } from "./build-otio";

/**
 * Fige la timeline des vidéos produit telle qu'elle sort aujourd'hui : le
 * découpage de build-otio.ts (15/10/2026) ne doit RIEN changer au fichier
 * produit. Toute différence voulue se relit dans le diff de l'instantané.
 */
const TOUR: OtioExportInputs = {
  tourName: "Démo produit",
  fps: 30,
  introSec: 2.2,
  outroSec: 2.2,
  videoClips: [
    { name: "Accueil", mediaPathAbs: "/tmp/tours/demo/section 01.mp4", srcInSec: 0.5, durationSec: 6, postSplashSec: 0, extendTailSec: 0, mediaDurationSec: 7, snappedBeatSec: 8.7 },
    { name: "Panier", mediaPathAbs: "/tmp/tours/demo/section-02.mp4", srcInSec: 0, durationSec: 4, postSplashSec: 1.5, extendTailSec: 2, mediaDurationSec: null, snappedBeatSec: null },
  ],
  voSegments: [
    { srcStartSec: 0, durationSec: 3, atCompSec: 2 },
    { srcStartSec: 3, durationSec: 2.5, atCompSec: 4.5 },
  ],
  voiceoverPathAbs: "/tmp/tours/demo/voiceover.mp3",
  voiceoverDurationSec: 6,
  bgMusicPathAbs: "/tmp/musique/été.mp3",
  bgMusicDurationSec: 120,
};

describe("buildOtioTimeline — vidéos produit", () => {
  it("produit exactement la même timeline qu'avant le découpage", () => {
    expect(buildOtioTimeline(TOUR)).toMatchSnapshot();
  });

  it("sans voix off, la timeline n'a que la vidéo et la musique", () => {
    const timeline = buildOtioTimeline({ ...TOUR, voiceoverPathAbs: null, voSegments: null });
    expect(timeline.tracks.children.map((t) => t.name)).toEqual(["Sections", "Musique"]);
  });

  it("un J-cut qui chevauche la réplique précédente est retardé, pas superposé", () => {
    const timeline = buildOtioTimeline(TOUR);
    const voix = timeline.tracks.children[1].children.filter((c) => c.OTIO_SCHEMA === "Clip.2");
    // La 2e réplique devait partir à 4,5 s alors que la 1re finit à 5 s.
    expect(voix[1].source_range.start_time.value).toBe(Math.round(3.5 * 30));
  });
});
