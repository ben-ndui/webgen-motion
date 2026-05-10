/**
 * Motion design categories. Each tour section references a category
 * which provides the palette : backdrop colour for the device frame
 * (compositor), splash card bg, overlay accent.
 *
 * Module is **client + server safe** — pure TS data, no fs imports.
 * Source-of-truth values are kept in sync with `categories.json` at
 * the repo root. The JSON sibling exists for the upcoming visual
 * category editor (Sprint 5+) and for runner-side overrides via
 * `motion-categories-fs.ts` (server only — reads disk + merges).
 *
 * Don't add fs/os imports here. If you need disk-loaded data, use
 * `motion-categories-fs.ts` from a server context.
 */

export interface MotionCategory {
  id: string;
  /** Short label shown in the splash card. */
  label: string;
  /** Subtitle / sigle (ex. "Bump → Tag → Stores"). */
  sigle?: string;
  /** Solid background colour — splash card + compositor backdrop. */
  bgColor: string;
  /** Accent colour for highlights and underlines. */
  accent: string;
  /** Text colour on bgColor (chosen for contrast). */
  fg: string;
}

export const MOTION_CATEGORIES: Record<string, MotionCategory> = {
  branding: {
    id: "branding",
    label: "Branding",
    sigle: "Identity · Hero · Promise",
    bgColor: "#0B38BF",
    accent: "#FFFFFF",
    fg: "#FFFFFF",
  },
  features: {
    id: "features",
    label: "Features",
    sigle: "What it does · Highlights",
    bgColor: "#16213E",
    accent: "#E94560",
    fg: "#FFFFFF",
  },
  pipeline: {
    id: "pipeline",
    label: "Pipeline",
    sigle: "Bump · Tag · CI · Stores",
    bgColor: "#0B38BF",
    accent: "#00CEC9",
    fg: "#FFFFFF",
  },
  releases: {
    id: "releases",
    label: "Releases",
    sigle: "Notes · Stores · Changelog",
    bgColor: "#1A1A2E",
    accent: "#FFD700",
    fg: "#FFFFFF",
  },
  stores: {
    id: "stores",
    label: "App Stores",
    sigle: "App Store + Play Store",
    bgColor: "#0F3460",
    accent: "#3B5FC7",
    fg: "#FFFFFF",
  },
  ai: {
    id: "ai",
    label: "AI",
    sigle: "Smart features · LLM-backed",
    bgColor: "#1B0F3D",
    accent: "#00CEC9",
    fg: "#FFFFFF",
  },
  motion: {
    id: "motion",
    label: "Motion Studio",
    sigle: "Vidéos auto · données live",
    bgColor: "#16213E",
    accent: "#E94560",
    fg: "#FFFFFF",
  },
  pricing: {
    id: "pricing",
    label: "Pricing",
    sigle: "Plans · Tiers",
    bgColor: "#00B894",
    accent: "#FDCB6E",
    fg: "#FFFFFF",
  },
};

export function getCategory(id: string | undefined): MotionCategory | null {
  if (!id) return null;
  return MOTION_CATEGORIES[id] ?? null;
}
