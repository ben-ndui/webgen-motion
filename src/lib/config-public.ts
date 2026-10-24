import {
  DEFAULT_VOICEBOX_ENGINE,
  DEFAULT_VOICEBOX_INSTRUCT,
  DEFAULT_VOICEBOX_LANGUAGE,
  DEFAULT_VOICEBOX_MODEL_SIZE,
  DEFAULT_VOICEBOX_URL,
  type AgentProviderKind,
  type VoiceBackendKind,
  getConfig,
} from "./config";
import { resolveVoiceBackend } from "./config-resolve";
import { getEdition } from "./edition";

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
    instruct: string;
  };
  google: {
    voice: string;
    languageCode: string;
    credentialsPath: string | null;
    /** true si un service account est dispo (config OU env). */
    hasCredentials: boolean;
  };
  agent: {
    provider: AgentProviderKind;
    hasApiKey: boolean;
    apiKeyMasked: string | null;
    model: string;
  };
  veo: {
    hasApiKey: boolean;
    apiKeyMasked: string | null;
    /** true si GEMINI_API_KEY prend le relais quand la config est vide. */
    hasEnvKey: boolean;
  };
  fal: {
    hasApiKey: boolean;
    apiKeyMasked: string | null;
    /** true si FAL_KEY prend le relais quand la config est vide. */
    hasEnvKey: boolean;
  };
  envFallback: {
    hasApiKey: boolean;
    hasVoiceId: boolean;
  };
  /** True iff the resolved DEFAULT backend has enough info to run. */
  configured: boolean;
  /** Sprint 6 — edition active (community / studio / enterprise),
   *  pour que le client puisse grayed-out les features Studio quand
   *  pas débloquées. */
  edition: "community" | "studio" | "enterprise";
  /** Télémétrie d'activation anonyme (opt-out). Default true. */
  telemetryEnabled: boolean;
  /** Profil d'interface actif. Default "complet". */
  profilInterface: "complet" | "serie";
}
export function getPublicConfig(): PublicConfig {
  const cfg = getConfig();
  const apiKey = cfg.elevenlabs?.apiKey;
  const defaultBackend = cfg.defaultBackend ?? "elevenlabs";
  const agentProvider = cfg.agent?.provider ?? "anthropic";
  const agentKey = cfg.agent?.apiKey;
  const veoKey = cfg.veo?.apiKey;
  const falKey = cfg.fal?.apiKey;
  const agentDefaultModel =
    agentProvider === "anthropic"
      ? "claude-sonnet-4-6"
      : agentProvider === "openai"
        ? "gpt-4o"
        : "mistral-large-latest";
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
      instruct: cfg.voicebox?.instruct ?? DEFAULT_VOICEBOX_INSTRUCT,
    },
    google: {
      voice: cfg.google?.voice ?? "fr-FR-Neural2-D",
      languageCode: cfg.google?.languageCode ?? "fr-FR",
      credentialsPath: cfg.google?.credentialsPath ?? null,
      hasCredentials: !!(
        cfg.google?.credentialsPath || process.env.GOOGLE_APPLICATION_CREDENTIALS
      ),
    },
    agent: {
      provider: agentProvider,
      hasApiKey: !!agentKey,
      apiKeyMasked: agentKey ? mask(agentKey) : null,
      model: cfg.agent?.model ?? agentDefaultModel,
    },
    veo: {
      hasApiKey: !!veoKey,
      apiKeyMasked: veoKey ? mask(veoKey) : null,
      hasEnvKey: !!process.env.GEMINI_API_KEY,
    },
    fal: {
      hasApiKey: !!falKey,
      apiKeyMasked: falKey ? mask(falKey) : null,
      hasEnvKey: !!process.env.FAL_KEY,
    },
    envFallback: {
      hasApiKey: !!process.env.ELEVENLABS_API_KEY,
      hasVoiceId: !!process.env.ELEVENLABS_VOICE_ID,
    },
    configured: !!resolveVoiceBackend(),
    edition: getEdition(),
    telemetryEnabled: cfg.telemetry?.enabled ?? true,
    profilInterface: cfg.interface?.profil ?? "complet",
  };
}

function mask(key: string): string {
  if (key.length <= 8) return "•".repeat(key.length);
  return `${key.slice(0, 4)}${"•".repeat(Math.max(4, key.length - 8))}${key.slice(-4)}`;
}
