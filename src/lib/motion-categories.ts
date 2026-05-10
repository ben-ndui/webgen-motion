/**
 * Motion design categories. Each tour section references a category
 * which provides the palette: backdrop colour behind the device frame
 * (compositor), splash card bg, overlay accent.
 *
 * For Sprint 1 the catalogue is hardcoded TS with UZME-flavoured
 * defaults that double as demo examples. Sprint 2 will move this to
 * a `categories.json` so users can define their own without touching
 * the source.
 *
 * Keep the list tight — a tour with 12 different categories = chaotic
 * montage. Group under broader categories.
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
