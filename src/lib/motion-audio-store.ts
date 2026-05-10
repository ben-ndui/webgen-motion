import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { extname, join } from "node:path";

/**
 * Local filesystem store for audio assets (background music + future
 * voice-over recordings).
 *
 * Stored in `~/.webgen-motion/audio/` so it survives reboots and is
 * shared across runs of the dashboard. Outside the repo on purpose
 * — tracks shouldn't bloat git.
 *
 * Index format: `index.json` next to the audio files. Each track has
 * a stable id (slug + epoch suffix) used as the filename root, e.g.
 * `chill-loop-1709876543.mp3`.
 */

export interface AudioTrack {
  id: string;
  originalName: string;
  filename: string;
  sizeBytes: number;
  /** ffprobe duration in seconds, or -1 if probing failed. */
  durationSec: number;
  uploadedAt: string;
}

interface Index {
  tracks: AudioTrack[];
}

const ALLOWED_EXT = [".mp3", ".wav", ".m4a", ".aac", ".ogg"];
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

function getStoreDir(): string {
  const dir = join(homedir(), ".webgen-motion", "audio");
  mkdirSync(dir, { recursive: true });
  return dir;
}

function getIndexPath(): string {
  return join(getStoreDir(), "index.json");
}

function loadIndex(): Index {
  const path = getIndexPath();
  if (!existsSync(path)) return { tracks: [] };
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as Index;
  } catch {
    return { tracks: [] };
  }
}

function saveIndex(idx: Index): void {
  writeFileSync(getIndexPath(), JSON.stringify(idx, null, 2));
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function probeDuration(path: string): number {
  const r = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=nw=1:nk=1",
      path,
    ],
    { encoding: "utf-8" },
  );
  if (r.status !== 0) return -1;
  const sec = parseFloat((r.stdout ?? "").trim());
  return Number.isFinite(sec) ? sec : -1;
}

export function listTracks(): AudioTrack[] {
  const idx = loadIndex();
  return [...idx.tracks].sort((a, b) =>
    b.uploadedAt.localeCompare(a.uploadedAt),
  );
}

export function getTrack(id: string): AudioTrack | null {
  return loadIndex().tracks.find((t) => t.id === id) ?? null;
}

export function getTrackPath(id: string): string | null {
  const t = getTrack(id);
  if (!t) return null;
  const path = join(getStoreDir(), t.filename);
  return existsSync(path) ? path : null;
}

export interface AddTrackResult {
  ok: true;
  track: AudioTrack;
}
export interface AddTrackError {
  ok: false;
  error: string;
}

export async function addTrack(
  buf: Buffer,
  originalName: string,
): Promise<AddTrackResult | AddTrackError> {
  const ext = extname(originalName).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) {
    return {
      ok: false,
      error: `Format non supporté (${ext || "aucun"}). Acceptés : ${ALLOWED_EXT.join(", ")}`,
    };
  }
  if (buf.byteLength > MAX_BYTES) {
    return {
      ok: false,
      error: `Fichier trop volumineux (${(buf.byteLength / 1024 / 1024).toFixed(1)} MB > 25 MB)`,
    };
  }
  if (buf.byteLength < 1024) {
    return { ok: false, error: "Fichier trop petit, probablement vide" };
  }

  const slug = slugify(originalName) || "track";
  const id = `${slug}-${Date.now().toString(36)}`;
  const filename = `${id}${ext}`;
  const fullPath = join(getStoreDir(), filename);
  writeFileSync(fullPath, buf);

  const durationSec = probeDuration(fullPath);

  const track: AudioTrack = {
    id,
    originalName,
    filename,
    sizeBytes: buf.byteLength,
    durationSec,
    uploadedAt: new Date().toISOString(),
  };
  const idx = loadIndex();
  idx.tracks.push(track);
  saveIndex(idx);
  return { ok: true, track };
}

export function removeTrack(id: string): boolean {
  const idx = loadIndex();
  const i = idx.tracks.findIndex((t) => t.id === id);
  if (i === -1) return false;
  const t = idx.tracks[i];
  try {
    const path = join(getStoreDir(), t.filename);
    if (existsSync(path)) rmSync(path, { force: true });
  } catch {}
  idx.tracks.splice(i, 1);
  saveIndex(idx);
  return true;
}

/**
 * Self-heal: if `index.json` lists files that no longer exist on disk
 * (manual deletion), or vice versa, reconcile. Called lazily.
 */
export function reconcileIndex(): void {
  const idx = loadIndex();
  const dir = getStoreDir();
  const onDisk = new Set(
    readdirSync(dir).filter((f) => f !== "index.json"),
  );
  const surviving = idx.tracks.filter((t) => onDisk.has(t.filename));
  if (surviving.length !== idx.tracks.length) {
    saveIndex({ tracks: surviving });
  }
  const known = new Set(surviving.map((t) => t.filename));
  const orphans: AudioTrack[] = [];
  for (const f of onDisk) {
    if (!known.has(f) && ALLOWED_EXT.includes(extname(f).toLowerCase())) {
      const path = join(dir, f);
      orphans.push({
        id: f.replace(/\.[^.]+$/, ""),
        originalName: f,
        filename: f,
        sizeBytes: statSync(path).size,
        durationSec: -1,
        uploadedAt: new Date(statSync(path).mtimeMs).toISOString(),
      });
    }
  }
  if (orphans.length > 0) {
    saveIndex({ tracks: [...surviving, ...orphans] });
  }
}
