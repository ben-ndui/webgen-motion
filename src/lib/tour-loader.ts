import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { TourEntry } from "./types/tour";

/**
 * Tour loader. Tours live as JSON files in the repo's `tours/`
 * directory. Each file is a `TourEntry`. The filename (without `.json`)
 * is used as the tour id when the file's own `id` field is missing.
 *
 * In future iterations the loader can also pick up tours from a
 * user dir (e.g. `~/.webgen-motion/tours/`) so a clone can ship
 * default tours while users add their own without touching the repo.
 */

function getToursDir(): string {
  return join(process.cwd(), "tours");
}

export function getAllTours(): TourEntry[] {
  const dir = getToursDir();
  if (!existsSync(dir)) return [];
  const out: TourEntry[] = [];
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    const path = join(dir, file);
    if (!statSync(path).isFile()) continue;
    try {
      const raw = readFileSync(path, "utf-8");
      const tour = JSON.parse(raw) as TourEntry;
      if (!tour.id) tour.id = file.replace(/\.json$/, "");
      out.push(tour);
    } catch {
      // Malformed JSON — skip silently. Future: surface as a warning
      // in the UI's tour list.
    }
  }
  return out;
}

export function getTour(id: string | null | undefined): TourEntry | null {
  if (!id) return null;
  const path = join(getToursDir(), `${id}.json`);
  if (!existsSync(path)) return null;
  try {
    const tour = JSON.parse(readFileSync(path, "utf-8")) as TourEntry;
    if (!tour.id) tour.id = id;
    return tour;
  } catch {
    return null;
  }
}

/**
 * Persists `tour` to `tours/<id>.json`. Used by the visual editor
 * (Sprint 4) — every save mutates the project's source-of-truth file
 * directly. If `id` doesn't already exist, a new tour file is created.
 *
 * Throws on validation failure so the API can surface a 400 instead
 * of silently shipping a malformed tour.
 */
export function saveTour(id: string, tour: TourEntry): void {
  if (!id || !/^[\w-]+$/.test(id)) {
    throw new Error(`Invalid tour id: ${id}`);
  }
  if (!tour || typeof tour !== "object") {
    throw new Error("Tour body must be an object");
  }
  if (!Array.isArray(tour.steps)) {
    throw new Error("Tour.steps must be an array");
  }
  if (typeof tour.name !== "string" || !tour.name.trim()) {
    throw new Error("Tour.name is required");
  }
  if (typeof tour.startPath !== "string") {
    throw new Error("Tour.startPath is required");
  }
  if (
    tour.voiceMode !== undefined &&
    tour.voiceMode !== "per-step" &&
    tour.voiceMode !== "narrative"
  ) {
    throw new Error(`Tour.voiceMode must be "per-step" or "narrative"`);
  }
  if (
    tour.voiceMode === "narrative" &&
    (typeof tour.narrativeScript !== "string" || !tour.narrativeScript.trim())
  ) {
    throw new Error(
      `Tour.narrativeScript is required when voiceMode === "narrative"`,
    );
  }
  if (tour.voiceId !== undefined && typeof tour.voiceId !== "string") {
    throw new Error("Tour.voiceId must be a string");
  }
  if (tour.voiceModel !== undefined && typeof tour.voiceModel !== "string") {
    throw new Error("Tour.voiceModel must be a string");
  }
  if (
    tour.voiceBackend !== undefined &&
    tour.voiceBackend !== "elevenlabs" &&
    tour.voiceBackend !== "voicebox"
  ) {
    throw new Error(`Tour.voiceBackend must be "elevenlabs" or "voicebox"`);
  }
  for (const k of ["voiceboxProfileId", "voiceboxEngine", "voiceboxModelSize", "composeStyle"] as const) {
    if (tour[k] !== undefined && typeof tour[k] !== "string") {
      throw new Error(`Tour.${k} must be a string`);
    }
  }
  if (tour.voiceSettings !== undefined) {
    const vs = tour.voiceSettings;
    if (typeof vs !== "object" || vs === null) {
      throw new Error("Tour.voiceSettings must be an object");
    }
    for (const k of ["stability", "similarityBoost", "style"] as const) {
      const v = (vs as Record<string, unknown>)[k];
      if (v !== undefined && (typeof v !== "number" || v < 0 || v > 1)) {
        throw new Error(`Tour.voiceSettings.${k} must be a number between 0 and 1`);
      }
    }
    if (
      vs.useSpeakerBoost !== undefined &&
      typeof vs.useSpeakerBoost !== "boolean"
    ) {
      throw new Error("Tour.voiceSettings.useSpeakerBoost must be a boolean");
    }
  }
  // Force the on-disk id to match the path id — drops any client-side
  // tampering attempt.
  const normalized: TourEntry = { ...tour, id };
  const dir = getToursDir();
  if (!existsSync(dir)) {
    throw new Error(`Tours directory missing: ${dir}`);
  }
  const path = join(dir, `${id}.json`);
  writeFileSync(path, JSON.stringify(normalized, null, 2) + "\n");
}
