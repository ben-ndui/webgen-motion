/**
 * Phonetic respelling map for ElevenLabs TTS.
 *
 * **The map is empty by default.** Our previous heuristic respellings
 * (UZME→Youzmi, webgen-motion→"webgen motion", URL→"U R L", etc.)
 * caused more pronunciation artefacts than they fixed — ElevenLabs
 * French TTS already handles JSON, Puppeteer, TypeScript, CSS,
 * domain names and hyphenated identifiers naturally. Touching them
 * forced the model to read non-words, which is exactly what made
 * the voice stutter.
 *
 * For the rare word that REALLY needs help, prefer one of these
 * official channels over a naive substitution :
 *
 *   1. **SSML `<phoneme>`** inside the narrative script :
 *      `<phoneme alphabet="ipa" ph="ˈwɛb.ʒɛn">webgen</phoneme>` —
 *      eleven_multilingual_v2 honors this tag and pronounces the
 *      word with the supplied IPA. No globale map needed, scoped to
 *      that one occurrence.
 *
 *   2. **ElevenLabs pronunciation dictionary** (Starter+ plan) :
 *      upload a `.lex` (PLS) file via the API, reference its
 *      `dictionary_id` in the TTS request via
 *      `pronunciation_dictionary_locators`. Persistent, applied to
 *      every synthesis without touching the text.
 *
 *   3. **Last resort** — a substitution here, as a *natural French
 *      spelling* of the target sound. Example below ; keep it
 *      surgical and don't touch words Eleven already pronounces
 *      cleanly.
 */

export const BRAND_PRONUNCIATION: Record<string, string> = {
  // Surgical example only. Uncomment + adapt if Eleven really
  // mispronounces a specific term for your project.
  // UZME: "Youzmi",
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
