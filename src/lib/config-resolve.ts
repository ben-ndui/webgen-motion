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
      /** Consigne de ton ; "" = aucune. */
      instruct: string;
    }
  | {
      kind: "google";
      voice: string;
      languageCode: string;
      speakingRate: number;
      /** Dico de prononciation du tour (terme → IPA). */
      pronunciation: Record<string, string>;
      /** Chemin du service account (sinon ADC / env). */
      credentialsPath?: string;
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
  voiceGoogleVoice?: string;
  voiceGoogleRate?: number;
  voicePronunciation?: Record<string, string>;
}): ResolvedVoiceBackend | null {
  const cfg = getConfig();
  const kind: VoiceBackendKind =
    tour?.voiceBackend ?? cfg.defaultBackend ?? "elevenlabs";

  if (kind === "google") {
    // Credentials : chemin explicite config/tour, sinon ADC via
    // GOOGLE_APPLICATION_CREDENTIALS (résolu par le SDK à l'appel).
    const credentialsPath =
      cfg.google?.credentialsPath || process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!credentialsPath) return null; // pas de creds → backend inutilisable
    return {
      kind: "google",
      voice:
        (tour?.voiceGoogleVoice && tour.voiceGoogleVoice.trim()) ||
        cfg.google?.voice ||
        "fr-FR-Neural2-D",
      languageCode: cfg.google?.languageCode || "fr-FR",
      // Le tour prime sur la config globale : le débit fait partie du ton
      // d'un tour, pas des réglages de la machine.
      speakingRate: tour?.voiceGoogleRate ?? cfg.google?.speakingRate ?? 1.0,
      pronunciation: tour?.voicePronunciation ?? {},
      credentialsPath,
    };
  }

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
      instruct: cfg.voicebox?.instruct ?? DEFAULT_VOICEBOX_INSTRUCT,
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
 * Resolves the configured AI agent (Sprint 5). Config wins over env
 * (`ANTHROPIC_API_KEY`) so the wizard remains the canonical source.
 * Returns null when nothing is set or the apiKey is empty.
 */
export interface ResolvedAgent {
  provider: AgentProviderKind;
  apiKey: string;
  model: string;
}
export function resolveAgent(): ResolvedAgent | null {
  const cfg = getConfig();
  const provider = cfg.agent?.provider ?? "anthropic";
  const apiKey =
    cfg.agent?.apiKey ??
    (provider === "anthropic"
      ? process.env.ANTHROPIC_API_KEY
      : provider === "openai"
        ? process.env.OPENAI_API_KEY
        : process.env.MISTRAL_API_KEY);
  if (!apiKey) return null;
  const defaultModel =
    provider === "anthropic"
      ? "claude-sonnet-4-6"
      : provider === "openai"
        ? "gpt-4o"
        : "mistral-large-latest";
  return {
    provider,
    apiKey,
    model: cfg.agent?.model ?? defaultModel,
  };
}

/**
 * La clé Gemini qui paie les plans Veo. Config d'abord, puis
 * `GEMINI_API_KEY` (même ordre que l'agent). null : pas de cinéma IA.
 */
export function resolveVeoKey(): string | null {
  const cle = getConfig().veo?.apiKey ?? process.env.GEMINI_API_KEY;
  return cle && cle.trim() ? cle.trim() : null;
}
