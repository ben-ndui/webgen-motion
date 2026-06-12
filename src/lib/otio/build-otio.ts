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
 * Couverture schéma (vérifiée contre la sérialisation OTIO 0.15+) :
 *   Timeline.1 / Stack.1 / Track.1 / Clip.2 / Gap.1 /
 *   ExternalReference.1 / TimeRange.1 / RationalTime.1 / Marker.2
 *
 * Ce qui transfère : cuts, positions, trims, pistes audio, markers.
 * Ce qui reste côté Remotion (documenté via markers GAP) : intro /
 * outro cards, splash cards mobiles, transitions, Ken Burns, device
 * frames, sous-titres — les NLE ne peuvent pas rejouer du React.
 */

// ── Types OTIO (sous-ensemble utilisé) ────────────────────────────

interface OtioRationalTime {
  OTIO_SCHEMA: "RationalTime.1";
  rate: number;
  value: number;
}

interface OtioTimeRange {
  OTIO_SCHEMA: "TimeRange.1";
  duration: OtioRationalTime;
  start_time: OtioRationalTime;
}

interface OtioMarker {
  OTIO_SCHEMA: "Marker.2";
  metadata: Record<string, unknown>;
  name: string;
  color: string;
  marked_range: OtioTimeRange;
  comment: string;
}

interface OtioExternalReference {
  OTIO_SCHEMA: "ExternalReference.1";
  metadata: Record<string, unknown>;
  name: string;
  available_range: OtioTimeRange | null;
  available_image_bounds: null;
  target_url: string;
}

interface OtioClip {
  OTIO_SCHEMA: "Clip.2";
  metadata: Record<string, unknown>;
  name: string;
  source_range: OtioTimeRange;
  effects: unknown[];
  markers: OtioMarker[];
  enabled: boolean;
  media_references: Record<string, OtioExternalReference>;
  active_media_reference_key: string;
}

interface OtioGap {
  OTIO_SCHEMA: "Gap.1";
  metadata: Record<string, unknown>;
  name: string;
  source_range: OtioTimeRange;
  effects: unknown[];
  markers: OtioMarker[];
  enabled: boolean;
}

type OtioTrackChild = OtioClip | OtioGap;

interface OtioTrack {
  OTIO_SCHEMA: "Track.1";
  metadata: Record<string, unknown>;
  name: string;
  source_range: null;
  effects: unknown[];
  markers: OtioMarker[];
  enabled: boolean;
  children: OtioTrackChild[];
  kind: "Video" | "Audio";
}

export interface OtioTimeline {
  OTIO_SCHEMA: "Timeline.1";
  metadata: Record<string, unknown>;
  name: string;
  global_start_time: OtioRationalTime;
  tracks: {
    OTIO_SCHEMA: "Stack.1";
    metadata: Record<string, unknown>;
    name: string;
    source_range: null;
    effects: unknown[];
    markers: OtioMarker[];
    enabled: boolean;
    children: OtioTrack[];
  };
}

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

// ── Helpers ───────────────────────────────────────────────────────

function rt(fps: number, sec: number): OtioRationalTime {
  return { OTIO_SCHEMA: "RationalTime.1", rate: fps, value: Math.round(sec * fps) };
}

function range(fps: number, startSec: number, durSec: number): OtioTimeRange {
  return {
    OTIO_SCHEMA: "TimeRange.1",
    start_time: rt(fps, startSec),
    duration: rt(fps, Math.max(0, durSec)),
  };
}

function marker(
  fps: number,
  name: string,
  atSec: number,
  color: string,
  comment = "",
): OtioMarker {
  return {
    OTIO_SCHEMA: "Marker.2",
    metadata: {},
    name,
    color,
    marked_range: range(fps, atSec, 0),
    comment,
  };
}

function gap(fps: number, durSec: number, name: string, markers: OtioMarker[] = []): OtioGap {
  return {
    OTIO_SCHEMA: "Gap.1",
    metadata: {},
    name,
    source_range: range(fps, 0, durSec),
    effects: [],
    markers,
    enabled: true,
  };
}

function fileUrl(absPath: string): string {
  // encodeURI préserve les "/" mais encode espaces / accents — le
  // format attendu par Resolve pour les target_url file://.
  return "file://" + encodeURI(absPath);
}

function clip(
  fps: number,
  name: string,
  mediaPathAbs: string,
  srcInSec: number,
  durSec: number,
  mediaDurationSec: number | null,
  markers: OtioMarker[] = [],
): OtioClip {
  return {
    OTIO_SCHEMA: "Clip.2",
    metadata: {},
    name,
    source_range: range(fps, srcInSec, durSec),
    effects: [],
    markers,
    enabled: true,
    media_references: {
      DEFAULT_MEDIA: {
        OTIO_SCHEMA: "ExternalReference.1",
        metadata: {},
        name: mediaPathAbs.split("/").pop() ?? name,
        available_range:
          mediaDurationSec !== null ? range(fps, 0, mediaDurationSec) : null,
        available_image_bounds: null,
        target_url: fileUrl(mediaPathAbs),
      },
    },
    active_media_reference_key: "DEFAULT_MEDIA",
  };
}

function track(
  kind: "Video" | "Audio",
  name: string,
  children: OtioTrackChild[],
): OtioTrack {
  return {
    OTIO_SCHEMA: "Track.1",
    metadata: {},
    name,
    source_range: null,
    effects: [],
    markers: [],
    enabled: true,
    children,
    kind,
  };
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

  return {
    OTIO_SCHEMA: "Timeline.1",
    metadata: {
      "gen-motion": {
        generator: "GEN MOTION (webgen-motion) — Studio Edition",
        tour: inputs.tourName,
      },
    },
    name: inputs.tourName,
    global_start_time: rt(fps, 0),
    tracks: {
      OTIO_SCHEMA: "Stack.1",
      metadata: {},
      name: "tracks",
      source_range: null,
      effects: [],
      markers: [],
      enabled: true,
      children: tracks,
    },
  };
}
