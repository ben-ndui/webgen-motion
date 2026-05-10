import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
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
