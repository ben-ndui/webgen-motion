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

export type TourStep =
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
  steps: TourStep[];
}
