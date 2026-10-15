/**
 * Les briques d'une timeline OpenTimelineIO, en JSON pur (aucune
 * dépendance Python) : les types du sous-ensemble utilisé et les fonctions
 * qui les fabriquent. Partagées par les exports des vidéos produit
 * (build-otio.ts), des épisodes de série et du film de marque.
 *
 * Couverture schéma (vérifiée contre la sérialisation OTIO 0.15+) :
 *   Timeline.1 / Stack.1 / Track.1 / Clip.2 / Gap.1 / Transition.1 /
 *   ExternalReference.1 / TimeRange.1 / RationalTime.1 / Marker.2
 */

export interface OtioRationalTime {
  OTIO_SCHEMA: "RationalTime.1";
  rate: number;
  value: number;
}

export interface OtioTimeRange {
  OTIO_SCHEMA: "TimeRange.1";
  duration: OtioRationalTime;
  start_time: OtioRationalTime;
}

export interface OtioMarker {
  OTIO_SCHEMA: "Marker.2";
  metadata: Record<string, unknown>;
  name: string;
  color: string;
  marked_range: OtioTimeRange;
  comment: string;
}

export interface OtioExternalReference {
  OTIO_SCHEMA: "ExternalReference.1";
  metadata: Record<string, unknown>;
  name: string;
  available_range: OtioTimeRange | null;
  available_image_bounds: null;
  target_url: string;
}

export interface OtioClip {
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

export interface OtioGap {
  OTIO_SCHEMA: "Gap.1";
  metadata: Record<string, unknown>;
  name: string;
  source_range: OtioTimeRange;
  effects: unknown[];
  markers: OtioMarker[];
  enabled: boolean;
}

/** Fondu enchaîné : `in_offset` déborde sur le plan qui sort, `out_offset`
 *  sur celui qui entre, chacun pris dans les images AU-DELÀ de la coupe. */
export interface OtioTransition {
  OTIO_SCHEMA: "Transition.1";
  metadata: Record<string, unknown>;
  name: string;
  transition_type: "SMPTE_Dissolve";
  in_offset: OtioRationalTime;
  out_offset: OtioRationalTime;
}

export type OtioTrackChild = OtioClip | OtioGap | OtioTransition;

export interface OtioTrack {
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

export function rt(fps: number, sec: number): OtioRationalTime {
  return { OTIO_SCHEMA: "RationalTime.1", rate: fps, value: Math.round(sec * fps) };
}

export function range(fps: number, startSec: number, durSec: number): OtioTimeRange {
  return {
    OTIO_SCHEMA: "TimeRange.1",
    start_time: rt(fps, startSec),
    duration: rt(fps, Math.max(0, durSec)),
  };
}

export function marker(
  fps: number,
  name: string,
  atSec: number,
  color: string,
  comment = "",
  durSec = 0,
): OtioMarker {
  return {
    OTIO_SCHEMA: "Marker.2",
    metadata: {},
    name,
    color,
    marked_range: range(fps, atSec, durSec),
    comment,
  };
}

export function gap(fps: number, durSec: number, name: string, markers: OtioMarker[] = []): OtioGap {
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

export function fileUrl(absPath: string): string {
  // encodeURI préserve les "/" mais encode espaces / accents — le
  // format attendu par Resolve pour les target_url file://.
  return "file://" + encodeURI(absPath);
}

export function clip(
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

export function track(
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

export function dissolve(fps: number, name: string, avantLaCoupeSec: number, apresLaCoupeSec: number): OtioTransition {
  return {
    OTIO_SCHEMA: "Transition.1",
    metadata: {},
    name,
    transition_type: "SMPTE_Dissolve",
    in_offset: rt(fps, avantLaCoupeSec),
    out_offset: rt(fps, apresLaCoupeSec),
  };
}

/** La timeline complète, signée GEN MOTION dans ses métadonnées. */
export function timeline(fps: number, name: string, origine: Record<string, string>, tracks: OtioTrack[]): OtioTimeline {
  return {
    OTIO_SCHEMA: "Timeline.1",
    metadata: { "gen-motion": { generator: "GEN MOTION (webgen-motion) — Studio Edition", ...origine } },
    name,
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
