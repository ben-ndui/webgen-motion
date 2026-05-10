import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Persistent base dir for webgen-motion tour artifacts (sections,
 * voiceovers, final clips). Lives in `~/.webgen-motion/tours/` so
 * artifacts survive reboots and aren't tied to the repo.
 *
 * Layout:
 *   ~/.webgen-motion/
 *     audio/                       — uploaded library tracks
 *     vo-cache/                    — ElevenLabs TTS cache (sha1 keyed)
 *     tours/<tourId>/
 *       manifest.json              — section metadata + timings
 *       section-NN-<cat>.mp4       — per-section captures
 *       voiceover.mp3              — full timeline VO track
 *       voiceover-overrides.json   — per-step UI text overrides
 *       final.mp4                  — composed deliverable
 */

export function getMotionToursBaseDir(): string {
  return join(homedir(), ".webgen-motion", "tours");
}

export function getMotionTourDir(tourId: string): string {
  return join(getMotionToursBaseDir(), tourId);
}

export function getVoCacheDir(): string {
  return join(homedir(), ".webgen-motion", "vo-cache");
}
