/**
 * Sprint E — export OpenTimelineIO (Studio Edition).
 *
 * Génère une timeline .otio (JSON pur, AUCUNE dépendance Python) que
 * DaVinci Resolve importe nativement (File → Import Timeline) et
 * Premiere Pro via File → Import (support OTIO natif). Le pitch :
 * « Pas satisfait du montage auto ? Ouvre ton tour dans Resolve —
 * sections déjà découpées, voix off et musique déjà posées sur la
 * timeline, cuts calés sur les beats. »
 *
 * Ce module est un BUILDER PUR : il transforme les décisions déjà
 * prises par le pipeline (manifest + edit-plan.json) en arbre OTIO.
 * Pas de fs ici — le CLI (scripts/export-otio.ts) et la route API
 * (/api/motion/tour/export/otio) lisent les artefacts et écrivent le
 * fichier.
 *
 * Les briques OTIO (types, clip, gap, marker…) vivent dans elements.ts.
 *
 * Ce qui transfère : cuts, positions, trims, pistes audio, markers.
 * Ce qui reste côté Remotion (documenté via markers GAP) : intro /
 * outro cards, splash cards mobiles, transitions, Ken Burns, device
 * frames, sous-titres — les NLE ne peuvent pas rejouer du React.
 */

import {
  type OtioMarker,
  type OtioTimeline,
  type OtioTrack,
  type OtioTrackChild,
  clip,
  gap,
  marker,
  timeline,
  track,
} from "./elements";

export type { OtioTimeline } from "./elements";

// ── Inputs du builder ─────────────────────────────────────────────

export interface OtioVideoClipInput {
  name: string;
  /** Chemin ABSOLU du MP4 de section. */
  mediaPathAbs: string;
  /** In-point dans le média (UI trim head). */
  srcInSec: number;
  /** Durée jouée — côté média (sans le splash virtuel). */
  durationSec: number;
  /** Splash rendue par Remotion AVANT le média (captures mobiles) —
   *  matérialisée en Gap + marker dans la timeline. */
  postSplashSec: number;
  /** Sprint F — freeze du dernier frame APRÈS le média (la narration
   *  dépasse la vidéo). Matérialisé en Gap + marker. */
  extendTailSec: number;
  /** Durée totale du média (available_range). */
  mediaDurationSec: number | null;
  /** Beat sur lequel le cut sortant a été snappé (temps composition)
   *  → marker en fin de clip. */
  snappedBeatSec: number | null;
}

export interface OtioVoSegmentInput {
  srcStartSec: number;
  durationSec: number;
  atCompSec: number;
}

export interface OtioExportInputs {
  tourName: string;
  fps: number;
  introSec: number;
  outroSec: number;
  videoClips: OtioVideoClipInput[];
  /** Segments VO placés (Edit Engine). Null → fallback fichier
   *  continu à t=0 quand voiceoverPathAbs est présent. */
  voSegments: OtioVoSegmentInput[] | null;
  voiceoverPathAbs: string | null;
  voiceoverDurationSec: number | null;
  bgMusicPathAbs: string | null;
  bgMusicDurationSec: number | null;
}

// ── Builder ───────────────────────────────────────────────────────

export function buildOtioTimeline(inputs: OtioExportInputs): OtioTimeline {
  const { fps } = inputs;

  // ── Piste vidéo : intro gap + sections (+ gaps splash) + outro ──
  const videoChildren: OtioTrackChild[] = [];
  videoChildren.push(
    gap(fps, inputs.introSec, "Intro", [
      marker(fps, "Intro card — rendue par GEN MOTION (Remotion)", 0, "PURPLE"),
    ]),
  );
  let cursorSec = inputs.introSec;
  for (const vc of inputs.videoClips) {
    if (vc.postSplashSec > 0) {
      videoChildren.push(
        gap(fps, vc.postSplashSec, `Splash — ${vc.name}`, [
          marker(
            fps,
            `Splash card "${vc.name}" — rendue par GEN MOTION`,
            0,
            "PURPLE",
          ),
        ]),
      );
      cursorSec += vc.postSplashSec;
    }
    const clipMarkers: OtioMarker[] = [];
    if (vc.snappedBeatSec !== null) {
      // Marker en fin de clip (temps LOCAL au clip = média), où le
      // cut sortant tombe sur un beat de la musique.
      clipMarkers.push(
        marker(
          fps,
          "Cut snappé sur un beat",
          vc.srcInSec + Math.max(0, vc.durationSec - 1 / fps),
          "GREEN",
          "Frontière calée par l'Edit Engine sur la musique",
        ),
      );
    }
    videoChildren.push(
      clip(
        fps,
        vc.name,
        vc.mediaPathAbs,
        vc.srcInSec,
        vc.durationSec,
        vc.mediaDurationSec,
        clipMarkers,
      ),
    );
    cursorSec += vc.durationSec;
    if (vc.extendTailSec > 0) {
      // Extend-to-fit : GEN MOTION gèle le dernier frame pendant ce
      // temps — dans le NLE, un gap avec marker (le monteur peut le
      // remplacer par un freeze frame ou du B-roll).
      videoChildren.push(
        gap(fps, vc.extendTailSec, `Freeze — ${vc.name}`, [
          marker(
            fps,
            `Extension freeze "${vc.name}" — dernier frame gelé par GEN MOTION pour loger la narration`,
            0,
            "YELLOW",
          ),
        ]),
      );
      cursorSec += vc.extendTailSec;
    }
  }
  const timelineEndSec = cursorSec + inputs.outroSec;
  videoChildren.push(
    gap(fps, inputs.outroSec, "Outro", [
      marker(fps, "Outro card — rendue par GEN MOTION (Remotion)", 0, "PURPLE"),
    ]),
  );

  // ── Piste VO : segments placés (gaps entre), ou fichier continu ──
  const voChildren: OtioTrackChild[] = [];
  if (inputs.voiceoverPathAbs) {
    if (inputs.voSegments && inputs.voSegments.length > 0) {
      const segs = [...inputs.voSegments].sort((a, b) => a.atCompSec - b.atCompSec);
      let voCursor = 0;
      for (const seg of segs) {
        let at = seg.atCompSec;
        let dur = seg.durationSec;
        // Une piste OTIO ne peut pas superposer deux clips — si le
        // J-cut fait chevaucher le segment précédent, on retarde
        // l'entrée (la zone mangée est du lead silencieux).
        if (at < voCursor) {
          const shift = voCursor - at;
          at = voCursor;
          dur -= shift;
        }
        if (dur <= 0.02) continue;
        if (at > voCursor + 0.001) {
          voChildren.push(gap(fps, at - voCursor, "‧"));
        }
        voChildren.push(
          clip(
            fps,
            "Voix off",
            inputs.voiceoverPathAbs,
            seg.srcStartSec + (seg.durationSec - dur),
            dur,
            inputs.voiceoverDurationSec,
          ),
        );
        voCursor = at + dur;
      }
    } else {
      voChildren.push(
        clip(
          fps,
          "Voix off",
          inputs.voiceoverPathAbs,
          0,
          Math.min(
            inputs.voiceoverDurationSec ?? timelineEndSec,
            timelineEndSec,
          ),
          inputs.voiceoverDurationSec,
        ),
      );
    }
  }

  // ── Piste musique : un clip depuis t=0 ──────────────────────────
  const musicChildren: OtioTrackChild[] = [];
  if (inputs.bgMusicPathAbs) {
    const dur = Math.min(
      inputs.bgMusicDurationSec ?? timelineEndSec,
      timelineEndSec,
    );
    musicChildren.push(
      clip(fps, "Musique", inputs.bgMusicPathAbs, 0, dur, inputs.bgMusicDurationSec),
    );
  }

  const tracks: OtioTrack[] = [track("Video", "Sections", videoChildren)];
  if (voChildren.length > 0) tracks.push(track("Audio", "Voix off", voChildren));
  if (musicChildren.length > 0) tracks.push(track("Audio", "Musique", musicChildren));

  return timeline(fps, inputs.tourName, { tour: inputs.tourName }, tracks);
}
