import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { ResolvedVoiceBackend } from "../config";
import { applyPronunciation } from "../pronunciation";
import { fetchElevenLabsTts, fetchGoogleTts, fetchVoiceboxTts } from "./moteurs";
import { DEFAULT_VOICE_SETTINGS, type EffectiveVoiceSettings, type ElevenLabsAlignment } from "./types";

export interface TtsArtifact {
  mp3Path: string;
  /** Native ElevenLabs alignment (character-level). */
  alignment: ElevenLabsAlignment | null;
  /** Same shape but applied AFTER text normalization (digit→words…). */
  normalizedAlignment: ElevenLabsAlignment | null;
}

/**
 * Generate or fetch from cache the TTS audio for `text`, returns
 * the path to the cached MP3 PLUS the character-level alignment from
 * ElevenLabs. Phonetic substitutions (UZME→Youzmi) are applied before
 * hashing + sending to the API.
 *
 * Cache layout per text:
 *   <hash>.mp3                — the audio binary
 *   <hash>.alignment.json     — { alignment, normalizedAlignment }
 *
 * Both are written atomically; if one is missing on read we re-query
 * to keep them in sync.
 */
export async function ensureTts(
  text: string,
  cacheDir: string,
  backend: ResolvedVoiceBackend | null,
  effectiveSettings: EffectiveVoiceSettings = DEFAULT_VOICE_SETTINGS,
): Promise<TtsArtifact> {
  if (!backend) throw new Error("Voice backend not resolved");
  const phonetic = applyPronunciation(text);
  // Cache key depends on the backend identity — switching backend or
  // tweaking any synthesis param invalidates the cached MP3.
  const backendKey =
    backend.kind === "elevenlabs"
      ? `eleven|${backend.voiceId}|${backend.model}|${[
          effectiveSettings.stability.toFixed(3),
          effectiveSettings.similarityBoost.toFixed(3),
          effectiveSettings.style.toFixed(3),
          effectiveSettings.useSpeakerBoost ? "1" : "0",
        ].join(",")}`
      : backend.kind === "voicebox"
        ? `voicebox|${backend.profileId}|${backend.engine}|${backend.modelSize}|${backend.language}`
        : `google|${backend.voice}|${backend.languageCode}|${backend.speakingRate}|${JSON.stringify(backend.pronunciation)}`;
  const hash = createHash("sha1")
    .update(`${backendKey}|${phonetic}`)
    .digest("hex")
    .slice(0, 16);
  const mp3Path = join(cacheDir, `${hash}.mp3`);
  const alignPath = join(cacheDir, `${hash}.alignment.json`);
  if (existsSync(mp3Path) && existsSync(alignPath)) {
    const cached = JSON.parse(readFileSync(alignPath, "utf-8")) as {
      alignment: ElevenLabsAlignment | null;
      normalizedAlignment: ElevenLabsAlignment | null;
    };
    return {
      mp3Path,
      alignment: cached.alignment,
      normalizedAlignment: cached.normalizedAlignment,
    };
  }
  console.log(`      TTS → "${phonetic.slice(0, 60)}${phonetic.length > 60 ? "…" : ""}"`);
  const fetched =
    backend.kind === "elevenlabs"
      ? await fetchElevenLabsTts(phonetic, backend, effectiveSettings)
      : backend.kind === "voicebox"
        ? await fetchVoiceboxTts(phonetic, backend)
        : await fetchGoogleTts(phonetic, backend);
  writeFileSync(mp3Path, fetched.audio);
  writeFileSync(
    alignPath,
    JSON.stringify(
      {
        alignment: fetched.alignment,
        normalizedAlignment: fetched.normalizedAlignment,
      },
      null,
      2,
    ),
  );
  return {
    mp3Path,
    alignment: fetched.alignment,
    normalizedAlignment: fetched.normalizedAlignment,
  };
}
