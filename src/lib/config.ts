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

export interface MotionConfig {
  elevenlabs?: {
    apiKey?: string;
    voiceId?: string;
    /** ElevenLabs model id (default eleven_multilingual_v2). */
    model?: string;
  };
}

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
  };
  // Drop empty elevenlabs object so the JSON file stays clean.
  if (
    !next.elevenlabs?.apiKey &&
    !next.elevenlabs?.voiceId &&
    !next.elevenlabs?.model
  ) {
    delete next.elevenlabs;
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
 * Returns a redacted view of the config for client-side display
 * (Setup wizard pre-fill, status indicators). API keys are masked
 * to last 4 chars.
 */
export interface PublicConfig {
  elevenlabs: {
    hasApiKey: boolean;
    apiKeyMasked: string | null;
    voiceId: string | null;
    model: string;
  };
  envFallback: {
    hasApiKey: boolean;
    hasVoiceId: boolean;
  };
  configured: boolean;
}
export function getPublicConfig(): PublicConfig {
  const cfg = getConfig();
  const apiKey = cfg.elevenlabs?.apiKey;
  return {
    elevenlabs: {
      hasApiKey: !!apiKey,
      apiKeyMasked: apiKey ? mask(apiKey) : null,
      voiceId: cfg.elevenlabs?.voiceId ?? null,
      model: cfg.elevenlabs?.model ?? "eleven_multilingual_v2",
    },
    envFallback: {
      hasApiKey: !!process.env.ELEVENLABS_API_KEY,
      hasVoiceId: !!process.env.ELEVENLABS_VOICE_ID,
    },
    configured: !!resolveElevenLabs(),
  };
}

function mask(key: string): string {
  if (key.length <= 8) return "•".repeat(key.length);
  return `${key.slice(0, 4)}${"•".repeat(Math.max(4, key.length - 8))}${key.slice(-4)}`;
}
