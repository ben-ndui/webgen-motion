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
  // UZME → "Youzmi" (you-z-mee). Demo example — keep or replace.
  UZME: "Youzmi",
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
