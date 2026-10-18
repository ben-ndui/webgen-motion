import { marksToCharAlignment } from "../google-alignment";
import type { ResolvedVoiceBackend } from "../config-resolve";
import type { EffectiveVoiceSettings, ElevenLabsAlignment } from "./types";
import { delaiDAttenteVoicebox, messageDelaiDepasse } from "./delai-voicebox";
import { consigneSuivie } from "./consigne";

/** Les trois fournisseurs de voix (voir synthese.ts pour le cache). SERVEUR SEULEMENT. */

export interface FetchedTts {
  audio: Buffer;
  alignment: ElevenLabsAlignment | null;
  normalizedAlignment: ElevenLabsAlignment | null;
}

/**
 * Google Cloud TTS (Neural2, GRATUIT quota) via le package smoothandesign-tts.
 * Récupère les timepoints Google (1 <mark> par mot) et les convertit en
 * alignement char-level (format ElevenLabs) → sous-titres karaoké compatibles.
 * La prononciation (dico du tour) est appliquée en SSML <phoneme> DANS le
 * package (pas de substitution texte). Durée du dernier mot estimée depuis
 * l'espacement médian des marks (suffisant : le pad ffmpeg cale la longueur).
 */
export async function fetchGoogleTts(
  text: string,
  cfg: Extract<ResolvedVoiceBackend, { kind: "google" }>,
): Promise<FetchedTts> {
  const { synthGoogleTtsAligned } = await import("smoothandesign-tts");
  const { mp3, marks } = await synthGoogleTtsAligned(text, {
    voice: cfg.voice,
    languageCode: cfg.languageCode,
    speakingRate: cfg.speakingRate,
    pronunciation: cfg.pronunciation,
  });
  const gaps: number[] = [];
  for (let i = 1; i < marks.length; i++) {
    const g = marks[i].timeSec - marks[i - 1].timeSec;
    if (g > 0) gaps.push(g);
  }
  gaps.sort((a, b) => a - b);
  const medianGap = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 0.4;
  const lastStart = marks.length ? marks[marks.length - 1].timeSec : 0;
  const alignment = marksToCharAlignment(text, marks, lastStart + medianGap);
  return { audio: mp3, alignment, normalizedAlignment: alignment };
}

export async function fetchElevenLabsTts(
  text: string,
  cfg: Extract<ResolvedVoiceBackend, { kind: "elevenlabs" }>,
  effectiveSettings: EffectiveVoiceSettings,
): Promise<FetchedTts> {
  // `/with-timestamps` returns JSON { audio_base64, alignment,
  // normalized_alignment } instead of the raw MP3 binary. Same body
  // shape as the standard endpoint, just a different content type.
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(cfg.voiceId)}/with-timestamps`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": cfg.apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: cfg.model,
      voice_settings: {
        stability: effectiveSettings.stability,
        similarity_boost: effectiveSettings.similarityBoost,
        style: effectiveSettings.style,
        use_speaker_boost: effectiveSettings.useSpeakerBoost,
      },
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "<no body>");
    throw new Error(
      `ElevenLabs TTS failed (${res.status}): ${errText.slice(0, 500)}`,
    );
  }
  const json = (await res.json()) as {
    audio_base64?: string;
    alignment?: ElevenLabsAlignment | null;
    normalized_alignment?: ElevenLabsAlignment | null;
  };
  if (!json.audio_base64) {
    throw new Error(`ElevenLabs response missing audio_base64`);
  }
  const audio = Buffer.from(json.audio_base64, "base64");
  if (audio.byteLength < 1024) {
    throw new Error(`ElevenLabs returned suspiciously small payload (${audio.byteLength} bytes)`);
  }
  return {
    audio,
    alignment: json.alignment ?? null,
    normalizedAlignment: json.normalized_alignment ?? null,
  };
}

/**
 * Voicebox synthesis pipeline. The backend is asynchronous : POST
 * /generate enqueues a job and returns a generation_id, then we
 * poll /generate/{id}/status until completed, then download from
 * /audio/{id}.
 *
 * No char-level timestamps are returned : `fetched.alignment = null`.
 * The narrative runner (scripts/audio-tour.ts) computes them afterwards
 * by forced alignment (voix/alignement-de-la-voix.ts, French model
 * installed from Réglages › Écoute locale).
 */
export async function fetchVoiceboxTts(
  text: string,
  cfg: Extract<ResolvedVoiceBackend, { kind: "voicebox" }>,
): Promise<FetchedTts> {
  const base = cfg.url.replace(/\/+$/, "");

  const submitRes = await fetch(`${base}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      profile_id: cfg.profileId,
      text,
      language: cfg.language,
      engine: cfg.engine,
      model_size: cfg.modelSize,
      // La consigne de ton (« enjouée… ») ; absente du corps quand Ben n'en veut pas.
      ...(consigneSuivie(cfg) ? { instruct: consigneSuivie(cfg) } : {}),
      normalize: true,
      crossfade_ms: 50,
    }),
  });
  if (!submitRes.ok) {
    const errText = await submitRes.text().catch(() => "<no body>");
    throw new Error(
      `Voicebox /generate failed (${submitRes.status}): ${errText.slice(0, 500)}`,
    );
  }
  const submit = (await submitRes.json()) as {
    id?: string;
    status?: string;
    error?: string | null;
  };
  const generationId = submit.id;
  if (!generationId) {
    throw new Error(`Voicebox /generate returned no id`);
  }

  // Voicebox exposes status via **SSE**, not JSON polling — each event
  // is `data: {…}\n\n` and the stream closes on completed/failed.
  // We consume it once and break out as soon as a terminal status
  // event lands. The abort fence follows the text length (delai-voicebox.ts).
  const timeoutMs = delaiDAttenteVoicebox(text);
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeoutMs);
  let finalStatus = "generating";
  let lastError: string | null = null;
  try {
    const sseRes = await fetch(
      `${base}/generate/${encodeURIComponent(generationId)}/status`,
      {
        headers: { Accept: "text/event-stream" },
        signal: abort.signal,
      },
    );
    if (!sseRes.ok || !sseRes.body) {
      throw new Error(
        `Voicebox /generate/${generationId}/status failed (${sseRes.status})`,
      );
    }
    const reader = sseRes.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    outer: while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      // SSE events are separated by a blank line ; collect full events.
      const events = buf.split("\n\n");
      buf = events.pop() ?? "";
      for (const ev of events) {
        const payload = ev
          .split("\n")
          .filter((l) => l.startsWith("data: "))
          .map((l) => l.slice(6))
          .join("");
        if (!payload) continue;
        try {
          const parsed = JSON.parse(payload) as {
            status?: string;
            error?: string | null;
          };
          if (parsed.status) finalStatus = parsed.status;
          if (parsed.error) lastError = parsed.error;
          if (finalStatus === "completed" || finalStatus === "failed") {
            await reader.cancel().catch(() => {});
            break outer;
          }
        } catch {
          // malformed event — skip
        }
      }
    }
  } catch (erreur) {
    if (abort.signal.aborted) throw new Error(messageDelaiDepasse(timeoutMs));
    throw erreur;
  } finally {
    clearTimeout(timer);
  }
  if (finalStatus === "failed") {
    throw new Error(
      `Voicebox generation failed : ${lastError ?? "no error message"}`,
    );
  }
  if (finalStatus !== "completed") {
    throw new Error(
      `Voicebox generation didn't reach completed (last status: ${finalStatus})`,
    );
  }

  const audioRes = await fetch(
    `${base}/audio/${encodeURIComponent(generationId)}`,
  );
  if (!audioRes.ok) {
    throw new Error(
      `Voicebox /audio/${generationId} failed (${audioRes.status})`,
    );
  }
  const audio = Buffer.from(await audioRes.arrayBuffer());
  if (audio.byteLength < 1024) {
    throw new Error(
      `Voicebox returned suspiciously small payload (${audio.byteLength} bytes)`,
    );
  }

  return {
    audio,
    alignment: null,
    normalizedAlignment: null,
  };
}
