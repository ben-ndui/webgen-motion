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

  // webgen-motion tech terms : ElevenLabs in French TTS tends to
  // stutter on raw English camelCase / mixed-case identifiers. The
  // respellings below force a French phonetic reading.
  "webgen-motion": "Webjèn motion",
  "ElevenLabs": "Eleven Labs",
  "Puppeteer": "Pupètiir",
  "baseUrl": "base U.R.L.",
  "base URL": "base U.R.L.",
  "data-testid": "data test ID",
  "data-tab": "data tab",
  "JSON": "djéssone",
  "TypeScript": "Taïpe Script",
  "TikTok": "Tiktok",
  "Reels": "Riils",
  "Stories": "Stoorize",
  "iPhone": "aïe Phone",
  "Mac chrome": "Mac krôme",
  "ffmpeg": "F.F. M-peg",
  "MP3": "M.P. trois",
  "MP4": "M.P. quatre",
  "API": "A.P.I.",
  "URL": "U.R.L.",
  "CSS": "C.S.S.",
  "DOM": "domme",
  // Case-insensitive matching handles capitalization at sentence
  // starts — one entry covers both "compose" and "Compose".
  "compose": "compoze",
  "setup": "sètt-up",
  // Smooth & Design : the ampersand confuses the parser; force "and"
  "Smooth & Design": "Smooth and Dizaïne",
  "Smooth and Design": "Smooth and Dizaïne",
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
