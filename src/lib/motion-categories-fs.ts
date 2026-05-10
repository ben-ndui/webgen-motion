import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  MOTION_CATEGORIES as DEFAULT_CATEGORIES,
  type MotionCategory,
} from "./motion-categories";

/**
 * **Server-only** loader for motion categories. Reads `categories.json`
 * at the repo root or the user's per-machine override at
 * `~/.webgen-motion/categories.json` and merges with the bundled
 * defaults from `motion-categories.ts`.
 *
 * Resolution order :
 *   1. ~/.webgen-motion/categories.json (per-user override)
 *   2. <repo>/categories.json (project-shipped customisation)
 *   3. DEFAULT_CATEGORIES (TS const, the bundled defaults)
 *
 * Don't import this from client components — uses node:fs/os and will
 * blow up the Turbopack browser bundle. Use `motion-categories.ts`
 * directly client-side (gets the bundled defaults).
 *
 * Used by the runner scripts (capture-tour / audio-tour / compose-tour)
 * and any server-only API route that needs the live, user-overrideable
 * palette.
 */

interface CategoriesFile {
  [id: string]: MotionCategory;
}

function loadFromPath(path: string): CategoriesFile | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as CategoriesFile;
  } catch {
    return null;
  }
}

let cached: Record<string, MotionCategory> | null = null;

export function loadAllCategories(): Record<string, MotionCategory> {
  if (cached) return cached;
  const userPath = join(homedir(), ".webgen-motion", "categories.json");
  const repoPath = join(process.cwd(), "categories.json");
  const fileData = loadFromPath(userPath) ?? loadFromPath(repoPath) ?? {};
  // User / repo entries override defaults by id; missing ids fall through
  // to the bundled TS const so the runner never crashes on a partial file.
  cached = { ...DEFAULT_CATEGORIES, ...fileData };
  return cached;
}

/** Bypass the cache — call after the user edits `categories.json`. */
export function reloadCategoriesCache(): void {
  cached = null;
}

export function getCategoryFs(id: string | undefined): MotionCategory | null {
  if (!id) return null;
  return loadAllCategories()[id] ?? null;
}
