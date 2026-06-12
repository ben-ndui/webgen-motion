import { buildEditPlan } from "./edit-plan";

// ── Scénario per-step ────────────────────────────────────────────
// Section 1 : 10s vidéo, splash 2s, step VO 3s (parle 2.2s), step
// silence 4s → grosse traîne morte. Section 2 : 8s, VO 5s.
const chars = (text: string, t0: number) => {
  const cs = text.split("");
  return {
    characters: cs,
    character_start_times_seconds: cs.map((_, i) => t0 + i * 0.05),
    character_end_times_seconds: cs.map((_, i) => t0 + (i + 1) * 0.05),
  };
};

const plan = buildEditPlan({
  fps: 30,
  introSec: 2.2,
  defaultCrossfadeSec: 0.65,
  sections: [
    {
      index: 1, srcInSec: 0, playableSec: 10,
      contentStartSec: 2.35,
      stepTimings: [
        { linearIdx: 1, type: "overlay", dwellStartSec: 2.4, dwellSec: 3 },
        { linearIdx: 2, type: "wait", dwellStartSec: 5.4, dwellSec: 4 },
      ],
    },
    {
      index: 2, srcInSec: 0, playableSec: 8,
      contentStartSec: 2.35,
      stepTimings: [
        { linearIdx: 4, type: "overlay", dwellStartSec: 2.4, dwellSec: 5 },
      ],
    },
  ],
  alignment: {
    totalDurationSec: 17,
    items: [
      { linearStepIdx: 0, sectionIdx: 1, kind: "splash-silence", text: null, audioStartSec: 0, audioDurationSec: 2 },
      { linearStepIdx: 1, sectionIdx: 1, kind: "step-vo", text: "Bienvenue sur la démo produit.", audioStartSec: 2, audioDurationSec: 3, normalizedAlignment: chars("Bienvenue sur la démo produit.", 0) },
      { linearStepIdx: 2, sectionIdx: 1, kind: "step-silence", text: null, audioStartSec: 5, audioDurationSec: 4 },
      { linearStepIdx: 3, sectionIdx: 2, kind: "splash-silence", text: null, audioStartSec: 9, audioDurationSec: 2 },
      { linearStepIdx: 4, sectionIdx: 2, kind: "step-vo", text: "Voici le dashboard principal en action.", audioStartSec: 11, audioDurationSec: 5, normalizedAlignment: chars("Voici le dashboard principal en action.", 0) },
    ],
  },
  // Voix parle 2.2s sur le slot [2,5] → silence [4.2 → 9] (traîne sec 1)
  voPauses: [
    { startSec: 0, endSec: 2.0, durationSec: 2.0 },
    { startSec: 4.2, endSec: 11.0, durationSec: 6.8 },
    { startSec: 15.5, endSec: 17.0, durationSec: 1.5 },
  ],
  // Beats autour des cuts attendus : cut sec1 ≈ intro+minDur.
  bgBeats: [
    { sec: 8.0, strength: 0.9 },
    { sec: 8.5, strength: 0.5 },
    { sec: 9.05, strength: 0.95 },  // dans la fenêtre de hunt
    { sec: 12.0, strength: 0.7 },
  ],
  enableTrim: true,
});

console.log(JSON.stringify(plan, null, 2));

// ── Assertions ───────────────────────────────────────────────────
const assert = (cond: boolean, msg: string) => {
  if (!cond) { console.error("✗ FAIL:", msg); process.exitCode = 1; }
  else console.log("✓", msg);
};

const s1 = plan.sections[0];
const s2 = plan.sections[1];
// Traîne sec1 : window [0,9], dernier VO actif à 4.2 → trailing 4.8,
// removable = 4.5, capé à 50% de 10 = 5 → removable 4.5, minDur 5.5.
assert(s1.trimmedTailSec > 3 && s1.trimmedTailSec <= 5, `sec1 trim substantiel (${s1.trimmedTailSec}s)`);
// Hunt window = [2.2+5.5, +0.85] = [7.7, 8.55] → beat 8.0 (0.9).
assert(s1.snappedBeat?.sec === 8.0, `sec1 cut snappé sur beat 8.0 (got ${s1.snappedBeat?.sec})`);
assert(Math.abs(s1.timelineStartSec - 2.2) < 0.001, "sec1 démarre après l'intro");
assert(Math.abs(s2.timelineStartSec - (2.2 + s1.playDurationSec)) < 0.001, "sec2 contiguë");
// Crossfade sec2 : beat fort (0.9) à 8.0 = cut exact → punchy 0.35.
assert(s2.crossfadeInSec === 0.35, `crossfade sec2 punchy (got ${s2.crossfadeInSec})`);
// Segments : VO sec1 placé au stepTiming 2.4 - J-cut 0.25 = 2.15 → comp 4.35.
const seg1 = plan.voSegments.find((v) => v.sectionIdx === 1);
assert(!!seg1 && Math.abs(seg1.atCompSec - (2.2 + 2.4 - 0.25)) < 0.001, `seg1 J-cut placé (got ${seg1?.atCompSec})`);
assert(!!seg1?.jCut, "seg1 marqué J-cut");
const seg2 = plan.voSegments.find((v) => v.sectionIdx === 2);
assert(!!seg2 && Math.abs(seg2.srcStartSec - 11) < 0.001, `seg2 source 11s (got ${seg2?.srcStartSec})`);
assert(plan.subtitles.length >= 2, `subtitles générées (${plan.subtitles.length} cues)`);
const firstCue = plan.subtitles[0];
assert(!!firstCue && Math.abs(firstCue.startSec - (seg1?.atCompSec ?? 0)) < 0.01, `1ère cue alignée sur seg1 (${firstCue?.startSec})`);
console.log(plan.summary.join("\n"));
