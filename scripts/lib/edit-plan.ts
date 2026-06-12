/**
 * Edit Engine — turns the raw artifacts the pipeline already produces
 * (manifest timings, ElevenLabs character alignment, beats + silence
 * analysis) into actual EDITING DECISIONS, the way a human editor
 * would work a rough cut :
 *
 *   1. Tail trim         — cut each section at its last voice-over
 *                          activity + breathing padding, so dwell
 *                          over-allocation never produces dead air.
 *                          Video AND audio cut at the same point, so
 *                          sync is preserved by construction.
 *   2. Beat snapping     — the trim padding is variable : within the
 *                          already-silent removable window, prefer a
 *                          cut that lands on a bg-music beat.
 *   3. J-cuts            — the first VO line of a section starts
 *                          ~250ms before its visuals settle (i.e.
 *                          during the splash fade), smoothing every
 *                          transition the way real editors do.
 *   4. Variable crossfade — short punchy crossfade when the cut sits
 *                          on a strong beat, longer when the music is
 *                          calm at that point.
 *   5. VO re-sync        — VO is emitted as per-section SEGMENTS of
 *                          voiceover.mp3 placed at each step's REAL
 *                          video time (manifest stepTimings), killing
 *                          the cumulative splash drift of the single
 *                          continuous track.
 *   6. Word-synced subtitles — karaoke cues derived from the
 *                          character-level alignment.
 *
 * Pure module : no fs, no CLI. compose-tour.ts feeds it the parsed
 * JSON artifacts and applies the resulting plan to the Remotion props.
 */

export interface EditAudioBeat {
  sec: number;
  strength: number;
}

export interface EditVoPause {
  startSec: number;
  endSec: number;
  durationSec: number;
}

export interface EditStepTiming {
  linearIdx: number;
  type: string;
  dwellStartSec: number;
  dwellSec: number;
}

/** Character-level alignment as returned by ElevenLabs (times are
 *  RELATIVE to the clip start ; the clip starts at its slot start). */
export interface EditCharAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

export interface EditAlignmentItem {
  linearStepIdx: number | null;
  sectionIdx: number;
  kind: string;
  text: string | null;
  audioStartSec: number;
  audioDurationSec: number;
  alignment?: EditCharAlignment | null;
  normalizedAlignment?: EditCharAlignment | null;
}

export interface EditAlignmentFile {
  totalDurationSec: number;
  items: EditAlignmentItem[];
  /** Narrative mode — character alignment of the WHOLE narration
   *  (times in voiceover.mp3 time). Items carry `sectionIdx: -1` and
   *  no per-item alignment in this mode ; their section is resolved
   *  through `stepSectionMap` and their words sliced from here. */
  normalizedAlignment?: EditCharAlignment | null;
  rawAlignment?: EditCharAlignment | null;
}

/** linearStepIdx → owning section, derived from the tour's steps by
 *  compose-tour (same walk as capture-tour's planSections). */
export type StepSectionMap = Record<
  number,
  { sectionIdx: number; isSectionMarker: boolean }
>;

export interface EditPlanSectionInput {
  index: number;
  /** Head trim (UI trim controls) — source MP4 in-point. */
  srcInSec: number;
  /** Effective playable duration after UI trim. */
  playableSec: number;
  contentStartSec?: number;
  stepTimings?: EditStepTiming[];
}

export interface EditPlanInputs {
  fps: number;
  /** Composition time where section 1 starts (intro hold). */
  introSec: number;
  defaultCrossfadeSec: number;
  sections: EditPlanSectionInput[];
  alignment: EditAlignmentFile | null;
  /** Required to resolve narrative-mode items (sectionIdx: -1) to
   *  their owning section. Per-step items don't need it. */
  stepSectionMap?: StepSectionMap;
  voPauses: EditVoPause[];
  bgBeats: EditAudioBeat[];
  /** Master switch for the tail trim (beat snapping + crossfade
   *  adaptation stay on either way — they never desync anything). */
  enableTrim: boolean;
}

export interface PlannedSection {
  index: number;
  /** Final playback duration after edit decisions (≤ playableSec). */
  playDurationSec: number;
  /** Seconds of trailing dead air removed from video + audio. */
  trimmedTailSec: number;
  /** Sprint F — extend-to-fit : secondes de FREEZE (dernier frame
   *  cloné par Remotion) ajoutées en fin de section quand la
   *  narration dépasse la vidéo capturée. Incluses dans
   *  playDurationSec ; le média ne couvre que
   *  playDurationSec - extendTailSec. */
  extendTailSec: number;
  /** Crossfade duration of the boundary ENTERING this section. */
  crossfadeInSec: number;
  /** Beat the section's END cut was snapped onto, if any. */
  snappedBeat: EditAudioBeat | null;
  /** Composition-time start (intro included). */
  timelineStartSec: number;
}

export interface VoSegment {
  sectionIdx: number;
  /** Offset within voiceover.mp3. */
  srcStartSec: number;
  durationSec: number;
  /** Composition-time placement. */
  atCompSec: number;
  /** True when this segment got the J-cut early start. */
  jCut: boolean;
}

export interface SubtitleWord {
  w: string;
  startSec: number;
  endSec: number;
}

export interface SubtitleCue {
  text: string;
  startSec: number;
  endSec: number;
  words: SubtitleWord[];
}

export interface EditPlan {
  version: 1;
  sections: PlannedSection[];
  voSegments: VoSegment[];
  subtitles: SubtitleCue[];
  /** Human-readable decision log, surfaced in the compose console. */
  summary: string[];
}

/** Steps dont le résultat DOIT rester visible — le trim ne coupe
 *  jamais avant la fin (≥1s) du dernier d'entre eux. Les steps
 *  passifs (wait / overlay) sont du remplissage que la voix gouverne
 *  et restent trimables. */
const INTERACTION_STEPS = new Set([
  "click", "type", "select", "hover", "scroll", "goto", "keypress",
  "launchApp", "tapOn", "inputText", "swipe", "back",
]);

/** Breathing room kept after the last VO activity in a section. */
const TAIL_PAD_SEC = 0.3;
/** Don't bother trimming less than this — not worth the cut. */
const MIN_TRIM_SEC = 0.4;
/** Never remove more than this share of a section. */
const MAX_TRIM_RATIO = 0.5;
/** How far past the minimal cut we'll extend to catch a beat. */
const BEAT_HUNT_SEC = 0.85;
/** A beat must be at least this strong to attract a cut. */
const BEAT_MIN_STRENGTH = 0.3;
/** J-cut lead — VO starts this much before the section's visuals. */
const J_CUT_SEC = 0.25;
/** Crossfade bounds for the beat-adaptive boundary duration. */
const XFADE_PUNCHY_SEC = 0.35;
const XFADE_MEDIUM_SEC = 0.5;
const XFADE_CALM_SEC = 0.8;
/** Sprint F — extension max d'une section (freeze) pour loger une
 *  narration qui dépasse la vidéo. Au-delà : plafonné + warning. */
const MAX_EXTEND_SEC = 12;
/** Max words per subtitle cue before splitting. */
const SUBTITLE_MAX_WORDS = 6;

export function buildEditPlan(inputs: EditPlanInputs): EditPlan {
  const {
    introSec,
    defaultCrossfadeSec,
    sections,
    alignment,
    voPauses,
    bgBeats,
    enableTrim,
  } = inputs;

  const summary: string[] = [];

  // ── Normalize alignment items (per-step AND narrative modes) ────
  // Per-step : items carry a valid sectionIdx, slot durations padded
  // to the step dwell, per-item character alignment (clip-relative).
  // Narrative : ONE continuous narration ; items are contiguous
  // slices with sectionIdx -1 → resolved via stepSectionMap, words
  // sliced from the file-level character alignment.
  const topAlign =
    alignment?.normalizedAlignment ?? alignment?.rawAlignment ?? null;

  interface NormVoItem {
    sectionIdx: number;
    linearStepIdx: number | null;
    audioStartSec: number;
    audioDurationSec: number;
    /** Section-level speech : plays from the section's very start. */
    isSectionLevel: boolean;
    /** Per-step mode : clip-relative character alignment. */
    charAlign: EditCharAlignment | null;
    /** Narrative mode : words come from `topAlign` slices instead. */
    narrative: boolean;
  }

  const voItemsBySection = new Map<number, NormVoItem[]>();
  const pushVoItem = (n: NormVoItem): void => {
    const arr = voItemsBySection.get(n.sectionIdx) ?? [];
    arr.push(n);
    voItemsBySection.set(n.sectionIdx, arr);
  };

  // Audio window per section inside voiceover.mp3 — the authoritative
  // mapping, immune to manifest duration drift. Includes the silence
  // slots in per-step mode so trailing dead steps count as trimmable.
  const audioWindows = new Map<number, { startSec: number; endSec: number }>();
  const widenWindow = (sectionIdx: number, start: number, end: number): void => {
    const w = audioWindows.get(sectionIdx);
    if (!w) {
      audioWindows.set(sectionIdx, { startSec: start, endSec: end });
    } else {
      w.startSec = Math.min(w.startSec, start);
      w.endSec = Math.max(w.endSec, end);
    }
  };

  if (alignment) {
    for (const it of alignment.items) {
      const end = it.audioStartSec + it.audioDurationSec;
      if (it.kind === "narrative-step") {
        const mapped =
          it.sectionIdx >= 0
            ? { sectionIdx: it.sectionIdx, isSectionMarker: false }
            : it.linearStepIdx !== null
              ? inputs.stepSectionMap?.[it.linearStepIdx]
              : undefined;
        if (!mapped) continue; // unresolvable → leave to the fallback player
        widenWindow(mapped.sectionIdx, it.audioStartSec, end);
        pushVoItem({
          sectionIdx: mapped.sectionIdx,
          linearStepIdx: it.linearStepIdx,
          audioStartSec: it.audioStartSec,
          audioDurationSec: it.audioDurationSec,
          isSectionLevel: mapped.isSectionMarker,
          charAlign: null,
          narrative: true,
        });
        continue;
      }
      if (it.sectionIdx < 0) continue;
      widenWindow(it.sectionIdx, it.audioStartSec, end);
      if (!it.kind.endsWith("-vo")) continue;
      pushVoItem({
        sectionIdx: it.sectionIdx,
        linearStepIdx: it.linearStepIdx,
        audioStartSec: it.audioStartSec,
        audioDurationSec: it.audioDurationSec,
        isSectionLevel: it.kind === "section-vo",
        charAlign: it.normalizedAlignment ?? it.alignment ?? null,
        narrative: false,
      });
    }
    for (const arr of voItemsBySection.values()) {
      arr.sort((a, b) => a.audioStartSec - b.audioStartSec);
    }
  }

  // ── Narrative fit gate ───────────────────────────────────────────
  // A narration that grossly overruns its sections' video can't be
  // re-synced by placement alone — segments would cut speech mid-
  // Placement RELATIF d'un item dans sa section (temps vidéo) —
  // partagé entre la passe d'extension et la passe segments pour que
  // les deux raisonnent sur exactement les mêmes positions.
  const placeRels = (
    voItems: NormVoItem[],
    sIn: EditPlanSectionInput,
    w: { startSec: number },
  ): Array<{ it: NormVoItem; rel: number; jCut: boolean }> => {
    const out: Array<{ it: NormVoItem; rel: number; jCut: boolean }> = [];
    let prevRel = 0;
    let prevDur = 0;
    for (const [k, it] of voItems.entries()) {
      const timing =
        it.linearStepIdx !== null
          ? sIn.stepTimings?.find((t) => t.linearIdx === it.linearStepIdx)
          : undefined;
      let rel: number;
      if (timing !== undefined) {
        rel = timing.dwellStartSec; // ground truth from the capture
      } else if (it.isSectionLevel) {
        rel = 0;
      } else if (it.narrative) {
        // No capture timings — keep the narration continuous inside
        // the section : first line when the content settles, then
        // chain each line after the previous one.
        rel = k === 0 ? (sIn.contentStartSec ?? 0) : prevRel + prevDur;
      } else {
        rel = it.audioStartSec - w.startSec; // dwell-based fallback
      }
      // UI head trim shifts the video origin.
      rel = Math.max(0, rel - sIn.srcInSec);
      // J-cut : the section's first line starts during the previous
      // visual's tail / the splash fade-out.
      const jCut = k === 0 && rel >= J_CUT_SEC;
      if (jCut) rel -= J_CUT_SEC;
      prevRel = rel;
      prevDur = it.audioDurationSec;
      out.push({ it, rel, jCut });
    }
    return out;
  };

  // ── Sprint F : extend-to-fit ─────────────────────────────────────
  // Quand la narration d'une section dépasse sa vidéo (tours
  // narrative mal calibrés, dwell trop courts), on ALLONGE la section
  // par un freeze du dernier frame (rendu par Remotion, le Ken Burns
  // continue de respirer dessus) plutôt que de couper la voix en
  // pleine phrase. Plafonné à MAX_EXTEND_SEC par section.
  const extendBySection = new Map<number, number>();
  for (const s of sections) {
    extendBySection.set(s.index, 0);
    const voItems = voItemsBySection.get(s.index);
    const w = audioWindows.get(s.index);
    if (!voItems?.length || !w) continue;
    const placed = placeRels(voItems, s, w);
    const lastSpeechEnd = Math.max(
      ...placed.map((p) => p.rel + p.it.audioDurationSec),
    );
    const required = lastSpeechEnd + TAIL_PAD_SEC;
    if (required > s.playableSec + 0.1) {
      const overflow = required - s.playableSec;
      extendBySection.set(s.index, round3(Math.min(overflow, MAX_EXTEND_SEC)));
      if (overflow > MAX_EXTEND_SEC) {
        summary.push(
          `⚠ section ${s.index} : la narration dépasse la vidéo de ${overflow.toFixed(1)}s — freeze plafonné à ${MAX_EXTEND_SEC}s, la fin sera coupée. Raccourcis le texte ou allonge les dwell.`,
        );
      }
    }
  }

  // ── Pass 1 : per-section tail trim (removable dead air) ─────────
  const removableBySection = new Map<number, number>();
  for (const s of sections) {
    removableBySection.set(s.index, 0);
    if (!enableTrim || !alignment) continue;
    // Une section étendue n'a pas de traîne morte à couper.
    if ((extendBySection.get(s.index) ?? 0) > 0) continue;
    const w = audioWindows.get(s.index);
    const voItems = voItemsBySection.get(s.index);
    // Silence-only sections are visual-on-purpose — leave them alone.
    if (!w || !voItems?.length) continue;

    const trailingSilence = trailingSilenceSec(w, voPauses);
    // The removable window must also exist in the VIDEO — sections can
    // be longer on the video side than the audio side (splash drift),
    // never shorter, but clamp defensively anyway.
    let removable = Math.max(0, trailingSilence - TAIL_PAD_SEC);
    removable = Math.min(removable, s.playableSec * MAX_TRIM_RATIO);
    // Jamais couper une INTERACTION visible : plancher à la fin
    // (≥1s de dwell) du dernier step d'action de la section. Un
    // monteur coupe le remplissage, pas le geste.
    const lastInteraction = [...(s.stepTimings ?? [])]
      .reverse()
      .find((t) => INTERACTION_STEPS.has(t.type));
    if (lastInteraction) {
      const floorSec =
        lastInteraction.dwellStartSec -
        s.srcInSec +
        Math.min(lastInteraction.dwellSec, 1.0);
      removable = Math.min(removable, Math.max(0, s.playableSec - floorSec));
    }
    if (removable < MIN_TRIM_SEC) continue;
    removableBySection.set(s.index, removable);
  }

  // ── Pass 2 : timeline walk — beat-snapped cut per section ───────
  const planned: PlannedSection[] = [];
  let cursor = introSec;
  let totalSaved = 0;
  let totalExtended = 0;
  for (const s of sections) {
    const removable = removableBySection.get(s.index) ?? 0;
    const extend = extendBySection.get(s.index) ?? 0;
    const minDur = s.playableSec - removable + extend;

    // Hunt for a beat past the minimal cut : dans la fenêtre morte
    // (removable) quand on trime, ou en prolongeant légèrement le
    // freeze quand on étend — dans les deux cas ça ne coûte rien.
    const huntRoom =
      removable > 0
        ? Math.min(removable, BEAT_HUNT_SEC)
        : extend > 0
          ? BEAT_HUNT_SEC
          : 0;
    let playDur = minDur;
    let snapped: EditAudioBeat | null = null;
    if (huntRoom > 0 && bgBeats.length > 0) {
      const huntStart = cursor + minDur;
      const huntEnd = huntStart + huntRoom;
      let best: EditAudioBeat | null = null;
      for (const b of bgBeats) {
        if (b.sec < huntStart || b.sec > huntEnd) continue;
        if (b.strength < BEAT_MIN_STRENGTH) continue;
        if (!best || b.strength > best.strength) best = b;
      }
      if (best) {
        playDur = best.sec - cursor;
        snapped = best;
      }
    }

    // Le média couvre playableSec en entier (un cut snappé dans la
    // fenêtre de trim reste DANS le média) ; seul ce qui dépasse
    // playableSec est du freeze rendu par Remotion.
    const extendTail = Math.max(0, playDur - s.playableSec);
    const trimmedTail = Math.max(0, s.playableSec - playDur);
    totalSaved += trimmedTail;
    totalExtended += extendTail;

    planned.push({
      index: s.index,
      playDurationSec: round3(playDur),
      trimmedTailSec: round3(trimmedTail),
      extendTailSec: round3(extendTail),
      crossfadeInSec: defaultCrossfadeSec, // refined in pass 3
      snappedBeat: snapped,
      timelineStartSec: round3(cursor),
    });
    cursor += playDur;
  }

  // ── Pass 3 : beat-adaptive crossfade per boundary ────────────────
  // Boundary entering section i sits at its timelineStartSec. Strong
  // beat nearby → short punchy crossfade ; calm music → longer fade.
  for (let i = 1; i < planned.length; i++) {
    const cut = planned[i].timelineStartSec;
    const nearest = nearestBeat(bgBeats, cut, 0.3);
    let xfade = defaultCrossfadeSec;
    if (nearest) {
      xfade =
        nearest.strength >= 0.6
          ? XFADE_PUNCHY_SEC
          : nearest.strength >= BEAT_MIN_STRENGTH
            ? XFADE_MEDIUM_SEC
            : defaultCrossfadeSec;
    } else if (bgBeats.length > 0) {
      // Music present but no beat near the cut — breathe longer.
      xfade = XFADE_CALM_SEC;
    }
    // Never let the fade eat more than ~40% of either neighbor.
    const cap =
      Math.min(planned[i - 1].playDurationSec, planned[i].playDurationSec) * 0.4;
    planned[i].crossfadeInSec = round3(Math.min(xfade, Math.max(0.2, cap)));
  }

  // ── Pass 4 : VO segments placed at REAL video time ──────────────
  const voSegments: VoSegment[] = [];
  const subtitles: SubtitleCue[] = [];
  if (alignment) {
    for (const p of planned) {
      const sIn = sections.find((s) => s.index === p.index);
      const w = audioWindows.get(p.index);
      const voItems = voItemsBySection.get(p.index) ?? [];
      if (!sIn || !w || voItems.length === 0) continue;

      const segs: VoSegment[] = [];
      for (const { it, rel, jCut } of placeRels(voItems, sIn, w)) {
        // Slot extends past the cut ? Keep the crossfade tail worth of
        // audio at most — the trimmed region is trailing silence in
        // per-step mode, and the bleed reads as an L-cut in narrative.
        const maxDur = p.playDurationSec - rel + defaultCrossfadeSec;
        const dur = Math.min(it.audioDurationSec, maxDur);
        if (dur <= 0.05) continue;

        segs.push({
          sectionIdx: p.index,
          srcStartSec: round3(it.audioStartSec),
          durationSec: round3(dur),
          atCompSec: round3(p.timelineStartSec + rel),
          jCut,
        });

        // Word-synced subtitle cues from the character alignment —
        // clip-relative in per-step mode, sliced from the file-level
        // narration alignment in narrative mode.
        const placement = p.timelineStartSec + rel;
        if (it.narrative && topAlign?.characters?.length) {
          const words = sliceWordsFromChars(
            topAlign,
            it.audioStartSec,
            it.audioStartSec + dur,
            placement - it.audioStartSec,
          );
          subtitles.push(...chunkIntoCues(words));
        } else if (it.charAlign?.characters?.length) {
          subtitles.push(...chunkIntoCues(wordsFromChars(it.charAlign, placement)));
        }
      }

      // Adjacent slots are contiguous in the source ; a J-cut shift
      // could make segment 0 overlap segment 1 — clamp to be safe.
      for (let k = 0; k < segs.length - 1; k++) {
        const gap = segs[k + 1].atCompSec - segs[k].atCompSec;
        if (gap > 0 && segs[k].durationSec > gap) {
          segs[k].durationSec = round3(gap);
        }
      }
      voSegments.push(...segs);
    }
  }

  // ── Summary ──────────────────────────────────────────────────────
  const snappedCount = planned.filter((p) => p.snappedBeat).length;
  const jCutCount = voSegments.filter((v) => v.jCut).length;
  if (totalSaved > 0.05) {
    summary.push(`trim : ${totalSaved.toFixed(1)}s de temps morts coupés (vidéo + voix sync)`);
  }
  if (totalExtended > 0.05) {
    const extCount = planned.filter((p) => p.extendTailSec > 0.05).length;
    summary.push(
      `extend-to-fit : ${extCount} section(s) prolongée(s) de ${totalExtended.toFixed(1)}s (freeze) pour loger la narration`,
    );
  }
  if (snappedCount > 0) {
    summary.push(`beats : ${snappedCount}/${planned.length} cuts snappés sur la musique`);
  }
  if (jCutCount > 0) {
    summary.push(`J-cuts : ${jCutCount} entrées voix anticipées (${J_CUT_SEC * 1000}ms)`);
  }
  if (voSegments.length > 0) {
    summary.push(`VO : ${voSegments.length} segments re-syncés sur le timing vidéo réel`);
  }
  if (subtitles.length > 0) {
    summary.push(`subtitles : ${subtitles.length} cues word-synced générées`);
  }
  if (summary.length === 0) {
    summary.push("aucune décision applicable (pas de VO / pas d'analyse)");
  }

  return { version: 1, sections: planned, voSegments, subtitles, summary };
}

/** Trailing silence of an audio window, from the VO silencedetect
 *  pauses. A pause that covers the window's end (±50ms tolerance —
 *  silencedetect may close slightly early on MP3 padding) counts for
 *  its overlap with the window. */
function trailingSilenceSec(
  w: { startSec: number; endSec: number },
  pauses: EditVoPause[],
): number {
  let best = 0;
  for (const p of pauses) {
    if (p.endSec < w.endSec - 0.05) continue; // doesn't reach the tail
    if (p.startSec >= w.endSec) continue; // entirely past the window
    const overlapStart = Math.max(p.startSec, w.startSec);
    best = Math.max(best, w.endSec - overlapStart);
  }
  return best;
}

function nearestBeat(
  beats: EditAudioBeat[],
  sec: number,
  withinSec: number,
): EditAudioBeat | null {
  let best: EditAudioBeat | null = null;
  let bestDist = withinSec;
  for (const b of beats) {
    const d = Math.abs(b.sec - sec);
    if (d <= bestDist) {
      bestDist = d;
      best = b;
    }
  }
  return best;
}

/** Group ElevenLabs character timings into words, shifted into
 *  composition time (`baseSec` = the clip's composition start). */
function wordsFromChars(
  a: EditCharAlignment,
  baseSec: number,
): SubtitleWord[] {
  const words: SubtitleWord[] = [];
  let buf = "";
  let start = 0;
  for (let i = 0; i < a.characters.length; i++) {
    const ch = a.characters[i];
    if (/\s/.test(ch)) {
      if (buf) {
        words.push({
          w: buf,
          startSec: round3(baseSec + start),
          endSec: round3(baseSec + (a.character_end_times_seconds[i - 1] ?? start)),
        });
        buf = "";
      }
      continue;
    }
    if (!buf) start = a.character_start_times_seconds[i] ?? 0;
    buf += ch;
  }
  if (buf) {
    const lastEnd =
      a.character_end_times_seconds[a.character_end_times_seconds.length - 1] ?? start;
    words.push({
      w: buf,
      startSec: round3(baseSec + start),
      endSec: round3(baseSec + lastEnd),
    });
  }
  return words;
}

/** Narrative mode — extract the words of a [fromSec, toSec) slice of
 *  the file-level narration alignment, shifted by `offsetSec` into
 *  composition time (offset = placementCompSec - sliceStartSec). */
function sliceWordsFromChars(
  a: EditCharAlignment,
  fromSec: number,
  toSec: number,
  offsetSec: number,
): SubtitleWord[] {
  const all = wordsFromChars(a, 0);
  return all
    .filter((w) => w.startSec >= fromSec - 0.02 && w.startSec < toSec)
    .map((w) => ({
      w: w.w,
      startSec: round3(w.startSec + offsetSec),
      endSec: round3(w.endSec + offsetSec),
    }));
}

/** Split a word stream into readable cues (≤ SUBTITLE_MAX_WORDS,
 *  break early on sentence punctuation). */
function chunkIntoCues(words: SubtitleWord[]): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  let chunk: SubtitleWord[] = [];
  const flush = () => {
    if (chunk.length === 0) return;
    cues.push({
      text: chunk.map((w) => w.w).join(" "),
      startSec: chunk[0].startSec,
      endSec: chunk[chunk.length - 1].endSec + 0.15,
      words: chunk,
    });
    chunk = [];
  };
  for (const w of words) {
    chunk.push(w);
    const endsSentence = /[.!?…:]$/.test(w.w);
    if (chunk.length >= SUBTITLE_MAX_WORDS || endsSentence) flush();
  }
  flush();
  return cues;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
