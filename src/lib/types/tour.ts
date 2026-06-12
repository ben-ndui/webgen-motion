/**
 * Tour types — describe a scripted E2E walkthrough that the runner
 * executes against a target site to produce per-section MP4s.
 *
 * Tours are stored as JSON files in the `tours/` directory at the
 * repo root. Each `<id>.json` validates as a `TourEntry`. See
 * `src/lib/tour-loader.ts` for the loader contract.
 *
 * Step types (executed sequentially by `scripts/capture-tour.ts`):
 *   - section    : new section (closes prev clip, opens new MP4,
 *                  shows full-screen splash with cat color/title)
 *   - goto       : navigate to a relative path
 *   - click      : click an element by selector
 *   - type       : type into an input
 *   - select     : pick an option in a <select>
 *   - hover      : hover an element (useful for tooltips)
 *   - scroll     : scroll a container or the window
 *   - wait       : pure dwell
 *   - overlay    : show a centered caption (top/bottom/center)
 *   - keypress   : send a keyboard key
 */

/** Sprint 15 — point d'intérêt cliquable mis en avant pendant la
 *  lecture d'une section. Le compositor zoome doucement sur (x,y) et
 *  affiche un label flottant ("Clique ici pour…") façon Apple Keynote
 *  demo. Coordonnées normalisées 0..1 relatives au cadre vidéo de la
 *  section (0,0 = haut-gauche, 1,1 = bas-droite). */
export interface Hotspot {
  /** Secondes depuis le début de la section (après trim). */
  t: number;
  /** 0..1 — position horizontale dans la frame vidéo. */
  x: number;
  /** 0..1 — position verticale dans la frame vidéo. */
  y: number;
  /** Libellé court affiché collé au point. */
  label: string;
  /** Facteur de zoom au plus fort du punch-in. Default 1.6. */
  zoom?: number;
  /** Durée du palier hold (max zoom + label visibles). Default 1.5s.
   *  La rampe d'entrée/sortie (0.4s in / 0.6s out) s'ajoute autour. */
  dwellSec?: number;
}

/** Sprint D — steps mobiles (capture-mobile.ts via Maestro). Les
 *  steps web (click/type/scroll par sélecteur CSS) n'ont pas de sens
 *  sur une app native ; ceux-ci mappent 1:1 sur les commandes
 *  Maestro (`tapOn`, `inputText`, `swipe`, `launchApp`). Un tour
 *  `platform: "ios" | "android"` n'utilise QUE ces steps + section /
 *  wait / overlay. */
export type MobileTourStep =
  | {
      type: "launchApp";
      /** Relance l'app même si déjà ouverte (clearState Maestro). */
      clearState?: boolean;
      dwellMs?: number;
      voiceover?: string;
    }
  | {
      type: "tapOn";
      /** Cible par texte visible OU par accessibility id — au moins
       *  l'un des deux. Texte accepte les regex Maestro. */
      text?: string;
      id?: string;
      dwellMs?: number;
      voiceover?: string;
    }
  | {
      type: "inputText";
      text: string;
      dwellMs?: number;
      voiceover?: string;
    }
  | {
      type: "swipe";
      direction: "up" | "down" | "left" | "right";
      dwellMs?: number;
      voiceover?: string;
    }
  | {
      type: "back"; // Android back / iOS swipe-back
      dwellMs?: number;
      voiceover?: string;
    };

export type TourStep =
  | MobileTourStep
  | {
      type: "section";
      categoryId: string;
      title: string;
      subtitle?: string;
      /** URL to navigate to while the splash is shown — hides page
       *  transition behind the colored card. */
      goto?: string;
      /** Splash hold duration in ms. Default 2000. */
      dwellMs?: number;
      /** Section-level VO. Plays the entire section duration. */
      voiceover?: string;
      /** Sprint 15.A — hotspots punch-in à animer dans cette section.
       *  Pour S15.A : définis manuellement ici. Pour S15.B : auto-
       *  écrits par capture-tour à partir des clics réels enregistrés
       *  pendant la capture Puppeteer. */
      hotspots?: Hotspot[];
    }
  | { type: "goto"; url: string; dwellMs?: number }
  | { type: "click"; selector: string; dwellMs?: number }
  | { type: "type"; selector: string; text: string; dwellMs?: number }
  | { type: "select"; selector: string; value: string; dwellMs?: number }
  | {
      type: "hover";
      selector: string;
      dwellMs?: number;
      voiceover?: string;
    }
  | {
      type: "scroll";
      selector?: string;
      to: number;
      dwellMs?: number;
      voiceover?: string;
    }
  | {
      type: "wait";
      dwellMs: number;
      voiceover?: string;
    }
  | {
      type: "overlay";
      text: string;
      position?: "top" | "bottom" | "center";
      categoryId?: string;
      dwellMs?: number;
      voiceover?: string;
    }
  | { type: "keypress"; key: string; dwellMs?: number };

export interface TourEntry {
  id: string;
  name: string;
  description: string;
  /** Estimated runtime in seconds — UI hint, runner doesn't enforce. */
  estimatedSec: number;
  /** Sprint D — capture target. "web" (défaut) filme un site via
   *  Puppeteer (capture-tour.ts) ; "ios" / "android" filment une app
   *  native pilotée par Maestro (capture-mobile.ts : simctl
   *  recordVideo / adb screenrecord). */
  platform?: "web" | "ios" | "android";
  /** Mobile only — bundle id iOS (com.example.app) ou package
   *  Android. Requis quand platform ≠ web. */
  appId?: string;
  /** Mobile only — UDID du simulateur / device. Défaut : le
   *  simulateur booté ("booted") ou le premier device adb. */
  deviceId?: string;
  /** Path to start at, relative to baseUrl. */
  startPath: string;
  /** Optional alternate origin (default: http://localhost:3000).
   *  Set to wherever your project is served. */
  baseUrl?: string;
  /** Auth strategy. "none" = public surface, "admin" = needs cookie
   *  (plumb-ed by the user via env var or session helper). */
  auth?: "none" | "admin";
  /** Output aspect ratio. "16:9" desktop / "9:16" mobile. */
  format?: "16:9" | "9:16";
  /** Optional path (repo-relative or absolute) of a bg music MP3.
   *  Mixed in compose at volume 0.18 (or ducked to 0.10 if VO too). */
  bgMusic?: string;
  /** Override the global voice backend ("elevenlabs" cloud or
   *  "voicebox" local). Falls back to the wizard's `defaultBackend`. */
  voiceBackend?: "elevenlabs" | "voicebox";
  /** Override the global ElevenLabs voice id for this tour. Falls back
   *  to the wizard's config / `ELEVENLABS_VOICE_ID` when empty. Useful
   *  when you target multiple projects with different brand voices. */
  voiceId?: string;
  /** Override the ElevenLabs model for this tour. Falls back to the
   *  global config / `ELEVENLABS_MODEL` / `eleven_multilingual_v2`. */
  voiceModel?: string;
  /** Voicebox profile UUID (visible in Voicebox's UI under "Profiles").
   *  Used when voiceBackend === "voicebox". */
  voiceboxProfileId?: string;
  /** Voicebox TTS engine choice (qwen / kokoro / chatterbox / luxtts
   *  / tada / qwen_custom_voice / chatterbox_turbo). Defaults to qwen
   *  for quality, kokoro for speed. */
  voiceboxEngine?: string;
  /** Voicebox model size hint when the engine supports it
   *  (qwen accepts 0.6B / 1.7B / 1B / 3B). */
  voiceboxModelSize?: string;
  /** Edit Engine — burn word-synced karaoke subtitles into the final
   *  video, derived from the ElevenLabs character-level alignment.
   *  Needs a generated voice-over. Particularly suited to 9:16. */
  subtitles?: boolean;
  /** Compose style preset (sober / energetic / cinematic / glitch).
   *  Drives Ken Burns intensity, transition mapping, backdrop motion,
   *  and beats layer strength inside the Remotion composition.
   *  Defaults to "energetic" when missing or unknown. */
  composeStyle?: string;
  /** Optional 3D device frame (Sprint 7 — Studio Edition). When set,
   *  les captures sont plaquées sur un device 3D animé via camera
   *  preset au lieu du Mac chrome / iPhone frame 2D classique. Le
   *  rendu 3D n'est activé que si le feature flag `frames-3d` est
   *  débloqué (Community fallback sur le 2D, ignore silencieusement). */
  frame3d?: "iphone" | "macbook";
  /** Camera preset utilisé quand `frame3d` est set. Default
   *  "hero-tilt" — un tilt-down subtil cinematic. */
  cameraPreset3d?:
    | "hero-tilt"
    | "feature-zoom"
    | "pan-right"
    | "flip-reveal"
    | "static-front"
    | "cinematic-spin";
  /** ElevenLabs voice settings — surfaced in the Script tab as sliders.
   *  All fields optional ; runner falls back to sensible defaults
   *  (stability 0.55, similarity 0.78, style 0.12, speaker boost on).
   *
   *  Lower stability = more emotion + variation but more stutters.
   *  Higher stability = robotic monotone. 0.55 is the sweet spot for
   *  technical narration mixing French + English identifiers. */
  voiceSettings?: {
    stability?: number;
    similarityBoost?: number;
    style?: number;
    useSpeakerBoost?: boolean;
  };
  /** Brand identity surfaced in the compose stage (intro card, outro
   *  card, Mac chrome URL bar). All fields optional — sensible
   *  fallbacks are computed from `name` and `baseUrl` when missing. */
  brand?: {
    /** Big logo text on the intro + outro card. Fallback: tour.name. */
    displayName?: string;
    /** Hostname shown in the Mac chrome URL bar. Fallback: hostname
     *  parsed from baseUrl, or "localhost". */
    domain?: string;
    /** Subtitle line under the outro logo (e.g. "by Smooth & Design").
     *  Fallback: same as `domain`. */
    tagline?: string;
  };
  /** How voice-over is sourced.
   *  - "per-step" (default, legacy): each step carries its own VO line,
   *    the runner concatenates them with silence padding to match the
   *    section MP4 durations.
   *  - "narrative": ONE continuous narration for the whole tour (see
   *    `narrativeScript`). ElevenLabs returns char-level timings; the
   *    runner derives each step's audioStartSec from `[step:N]` markers
   *    embedded in the script. Per-step `voiceover` fields are ignored. */
  voiceMode?: "per-step" | "narrative";
  /** Continuous narration text used when voiceMode === "narrative".
   *  Embed `[step:N]` markers (N = linear index in steps) at the points
   *  where each step's overlay should appear; the runner replaces each
   *  marker with an audio offset from the alignment timestamps. */
  narrativeScript?: string;
  steps: TourStep[];
}
