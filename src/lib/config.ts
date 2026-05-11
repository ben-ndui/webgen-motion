import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * User-managed config stored in `~/.webgen-motion/config.json`.
 *
 * Persists settings entered via the Setup wizard so users don't have
 * to maintain `.env.local` manually. Config values take precedence
 * over env vars when both are set — the wizard is the canonical source
 * of truth.
 *
 * Sensitive (apiKey) lives outside the repo. Never commit config.json.
 */

export type VoiceBackendKind = "elevenlabs" | "voicebox";

export interface MotionConfig {
  /** Which TTS backend the runner targets when a tour doesn't pick
   *  its own. Defaults to "elevenlabs" for backwards compat. */
  defaultBackend?: VoiceBackendKind;
  elevenlabs?: {
    apiKey?: string;
    voiceId?: string;
    /** ElevenLabs model id (default eleven_multilingual_v2). */
    model?: string;
  };
  /** Voicebox is a local-first TTS desktop app
   *  (https://github.com/jamiepine/voicebox). When selected, the
   *  runner hits its FastAPI on localhost — no API key, all inference
   *  stays on the user's machine. */
  voicebox?: {
    /** Base URL of the Voicebox FastAPI backend. */
    url?: string;
    /** Default voice profile UUID (visible via /profiles). */
    profileId?: string;
    /** Engine choice. Voicebox aggregates multiple TTS models — qwen
     *  is the safest default for multilingual quality, kokoro for
     *  raw speed. */
    engine?: string;
    /** Model size hint (qwen accepts 0.6B / 1.7B / 1B / 3B). */
    modelSize?: string;
    /** Language code passed to /generate — Voicebox requires it. */
    language?: string;
  };
}

const DEFAULT_VOICEBOX_URL = "http://127.0.0.1:17493";
const DEFAULT_VOICEBOX_ENGINE = "qwen";
const DEFAULT_VOICEBOX_MODEL_SIZE = "1.7B";
const DEFAULT_VOICEBOX_LANGUAGE = "fr";

function getConfigPath(): string {
  const dir = join(homedir(), ".webgen-motion");
  mkdirSync(dir, { recursive: true });
  return join(dir, "config.json");
}

export function getConfig(): MotionConfig {
  const path = getConfigPath();
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as MotionConfig;
  } catch {
    return {};
  }
}

/**
 * Merges `partial` into the existing config and writes it back.
 * Returns the new full config so the caller can confirm what was saved.
 */
export function saveConfig(partial: MotionConfig): MotionConfig {
  const current = getConfig();
  const next: MotionConfig = {
    ...current,
    ...partial,
    elevenlabs: {
      ...current.elevenlabs,
      ...partial.elevenlabs,
    },
    voicebox: {
      ...current.voicebox,
      ...partial.voicebox,
    },
  };
  // Drop empty sub-objects so the JSON file stays clean.
  if (
    !next.elevenlabs?.apiKey &&
    !next.elevenlabs?.voiceId &&
    !next.elevenlabs?.model
  ) {
    delete next.elevenlabs;
  }
  if (
    !next.voicebox?.url &&
    !next.voicebox?.profileId &&
    !next.voicebox?.engine &&
    !next.voicebox?.modelSize &&
    !next.voicebox?.language
  ) {
    delete next.voicebox;
  }
  writeFileSync(getConfigPath(), JSON.stringify(next, null, 2));
  return next;
}

/**
 * Resolves ElevenLabs credentials. Config wins over env vars so the
 * wizard's saved values aren't shadowed by a stale `.env.local`.
 * Returns null when nothing is set.
 */
export interface ElevenLabsCredentials {
  apiKey: string;
  voiceId: string;
  model: string;
}
export function resolveElevenLabs(): ElevenLabsCredentials | null {
  const cfg = getConfig();
  const apiKey = cfg.elevenlabs?.apiKey ?? process.env.ELEVENLABS_API_KEY;
  const voiceId = cfg.elevenlabs?.voiceId ?? process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId) return null;
  return {
    apiKey,
    voiceId,
    model:
      cfg.elevenlabs?.model ??
      process.env.ELEVENLABS_MODEL ??
      "eleven_multilingual_v2",
  };
}

/**
 * Tagged union exposed to the runner. The runner pattern-matches on
 * `kind` and never touches the underlying config keys directly.
 */
export type ResolvedVoiceBackend =
  | {
      kind: "elevenlabs";
      apiKey: string;
      voiceId: string;
      model: string;
    }
  | {
      kind: "voicebox";
      url: string;
      profileId: string;
      engine: string;
      modelSize: string;
      language: string;
    };

/**
 * Resolves the effective voice backend, picking up tour-level
 * overrides first (multi-projets light), then config.json, then env.
 * Returns null when the chosen backend doesn't have enough info to
 * synthesize (e.g. ElevenLabs with no key, Voicebox with no profile).
 */
export function resolveVoiceBackend(tour?: {
  voiceBackend?: VoiceBackendKind;
  voiceId?: string;
  voiceModel?: string;
  voiceboxProfileId?: string;
  voiceboxEngine?: string;
  voiceboxModelSize?: string;
}): ResolvedVoiceBackend | null {
  const cfg = getConfig();
  const kind: VoiceBackendKind =
    tour?.voiceBackend ?? cfg.defaultBackend ?? "elevenlabs";

  if (kind === "voicebox") {
    const profileId =
      (tour?.voiceboxProfileId && tour.voiceboxProfileId.trim()) ||
      cfg.voicebox?.profileId;
    if (!profileId) return null;
    return {
      kind: "voicebox",
      url: cfg.voicebox?.url ?? DEFAULT_VOICEBOX_URL,
      profileId,
      engine:
        (tour?.voiceboxEngine && tour.voiceboxEngine.trim()) ||
        cfg.voicebox?.engine ||
        DEFAULT_VOICEBOX_ENGINE,
      modelSize:
        (tour?.voiceboxModelSize && tour.voiceboxModelSize.trim()) ||
        cfg.voicebox?.modelSize ||
        DEFAULT_VOICEBOX_MODEL_SIZE,
      language: cfg.voicebox?.language ?? DEFAULT_VOICEBOX_LANGUAGE,
    };
  }

  const eleven = resolveElevenLabs();
  if (!eleven) return null;
  const tourVoiceId = tour?.voiceId?.trim();
  const tourModel = tour?.voiceModel?.trim();
  return {
    kind: "elevenlabs",
    apiKey: eleven.apiKey,
    voiceId: tourVoiceId && tourVoiceId.length > 0 ? tourVoiceId : eleven.voiceId,
    model: tourModel && tourModel.length > 0 ? tourModel : eleven.model,
  };
}

/**
 * Returns a redacted view of the config for client-side display
 * (Setup wizard pre-fill, status indicators). API keys are masked
 * to last 4 chars.
 */
export interface PublicConfig {
  defaultBackend: VoiceBackendKind;
  elevenlabs: {
    hasApiKey: boolean;
    apiKeyMasked: string | null;
    voiceId: string | null;
    model: string;
  };
  voicebox: {
    url: string;
    profileId: string | null;
    engine: string;
    modelSize: string;
    language: string;
  };
  envFallback: {
    hasApiKey: boolean;
    hasVoiceId: boolean;
  };
  /** True iff the resolved DEFAULT backend has enough info to run. */
  configured: boolean;
}
export function getPublicConfig(): PublicConfig {
  const cfg = getConfig();
  const apiKey = cfg.elevenlabs?.apiKey;
  const defaultBackend = cfg.defaultBackend ?? "elevenlabs";
  return {
    defaultBackend,
    elevenlabs: {
      hasApiKey: !!apiKey,
      apiKeyMasked: apiKey ? mask(apiKey) : null,
      voiceId: cfg.elevenlabs?.voiceId ?? null,
      model: cfg.elevenlabs?.model ?? "eleven_multilingual_v2",
    },
    voicebox: {
      url: cfg.voicebox?.url ?? DEFAULT_VOICEBOX_URL,
      profileId: cfg.voicebox?.profileId ?? null,
      engine: cfg.voicebox?.engine ?? DEFAULT_VOICEBOX_ENGINE,
      modelSize: cfg.voicebox?.modelSize ?? DEFAULT_VOICEBOX_MODEL_SIZE,
      language: cfg.voicebox?.language ?? DEFAULT_VOICEBOX_LANGUAGE,
    },
    envFallback: {
      hasApiKey: !!process.env.ELEVENLABS_API_KEY,
      hasVoiceId: !!process.env.ELEVENLABS_VOICE_ID,
    },
    configured: !!resolveVoiceBackend(),
  };
}

function mask(key: string): string {
  if (key.length <= 8) return "•".repeat(key.length);
  return `${key.slice(0, 4)}${"•".repeat(Math.max(4, key.length - 8))}${key.slice(-4)}`;
}
