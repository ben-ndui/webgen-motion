/**
 * Phonetic respelling map for ElevenLabs TTS. The free / Starter tier
 * doesn't expose pronunciation dictionaries, so we substitute brand-
 * specific words with phonetic equivalents in the raw text *before*
 * sending it to the API.
 *
 * Add brand entries via `~/.webgen-motion/pronunciation.json` (Sprint 2)
 * or by editing this file directly.
 *
 * Default map ships with `UZME → Youzmi` as the canonical demo example.
 * Drop or replace it for your own project.
 */

export const BRAND_PRONUNCIATION: Record<string, string> = {
  // Brand examples — keep or replace.
  UZME: "Youzmi",

  // Minimal map : only respellings that actually fix stuttering.
  // ElevenLabs French TTS handles tech terms fairly well — over-spelling
  // them ("djéssone" for JSON, "Pupètiir" for Puppeteer, "Webjèn" for
  // webgen) sounds robotic and is precisely what produces audible
  // artefacts. Rule of thumb : only touch words where Eleven literally
  // stutters or pauses, not words you'd "improve".
  //
  // Hyphens are the worst offender — Eleven sometimes reads them as
  // "tiret" or inserts a beat. Strip them.
  "webgen-motion": "webgen motion",
  "local-first": "local first",
  "data-testid": "data testid",
  "data-tab": "data tab",
  // ElevenLabs reads "ElevenLabs" letter-by-letter sometimes ;
  // splitting it as two words restores natural cadence.
  ElevenLabs: "Eleven Labs",
  // URL gets épelé in French tech speech. Order matters : the longer
  // "baseUrl" runs first, then the standalone "URL" gets letter-spaced.
  baseUrl: "base url",
  "base URL": "base url",
  URL: "U R L",
  // Keep the ampersand readable.
  "Smooth & Design": "Smooth and Design",
};

export function applyPronunciation(text: string): string {
  let out = text;
  for (const [from, to] of Object.entries(BRAND_PRONUNCIATION)) {
    const re = new RegExp(`\\b${escapeRegExp(from)}\\b`, "gi");
    out = out.replace(re, to);
  }
  return out;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
