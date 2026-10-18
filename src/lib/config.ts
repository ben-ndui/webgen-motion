import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { CONSIGNE_DE_TON_CONSEILLEE, LONGUEUR_MAX_CONSIGNE } from "./voix/consigne";

/**
 * User-managed config stored in `~/.webgen-motion/config.json`.
 *
 * Persists settings entered via the Setup wizard so users don't have
 * to maintain `.env.local` manually. Config values take precedence
 * over env vars when both are set — the wizard is the canonical source
 * of truth.
 *
 * Sensitive (apiKey) lives outside the repo. Never commit config.json.
 *
 * Ce fichier lit et écrit le config.json. Ce qu'on en DÉDUIT vit à côté :
 * config-resolve.ts (quel moteur de voix, quel agent) et config-public.ts
 * (la vue masquée envoyée au navigateur).
 */

export type VoiceBackendKind = "elevenlabs" | "voicebox" | "google";
export type AgentProviderKind = "anthropic" | "openai" | "mistral";

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
    /** Consigne de ton passée au moteur (`instruct`, 500 caractères au plus). Absente :
     *  la consigne par défaut ; chaîne VIDE : aucune consigne (voix neutre). */
    instruct?: string;
  };
  /** Google Cloud TTS (Neural2 FR) — voix GRATUITE dans le quota Google.
   *  Credentials via GOOGLE_APPLICATION_CREDENTIALS (service account JSON).
   *  Le dico de prononciation vit PAR TOUR (voicePronunciation). */
  google?: {
    /** Voix Google (défaut fr-FR-Neural2-D). */
    voice?: string;
    /** Code langue (défaut fr-FR). */
    languageCode?: string;
    /** Débit (défaut 1.0). */
    speakingRate?: number;
    /** Chemin du service account JSON (sinon GOOGLE_APPLICATION_CREDENTIALS). */
    credentialsPath?: string;
  };
  /** AI agent for auto-tour generation (Sprint 5). User brings their
   *  own key — webgen-motion ne proxifie rien, le user paie ses
   *  tokens directement à Anthropic / OpenAI / Mistral. */
  agent?: {
    /** Provider sélectionné dans le Setup wizard. */
    provider?: AgentProviderKind;
    /** Clé API du provider (plaintext, local-first config). */
    apiKey?: string;
    /** Modèle utilisé. Default Anthropic : claude-sonnet-4-6. */
    model?: string;
  };
  /** Veo (vidéo IA du cinéma des films de marque). Clé Gemini du user :
   *  il paie ses plans directement à Google, GEN MOTION ne proxifie rien. */
  veo?: {
    apiKey?: string;
  };
  /** Télémétrie anonyme d'activation (opt-out). Un seul event anonyme
   *  'activated' à la 1ère compose réussie — jamais de contenu ni d'email.
   *  cf. src/lib/telemetry.ts. */
  telemetry?: {
    /** Absent/true = activé (opt-out), false = désactivé par l'user. */
    enabled?: boolean;
    /** Id anonyme aléatoire, généré au 1er envoi seulement. */
    installId?: string;
    /** True une fois l'event 'activated' envoyé (envoyé une seule fois). */
    activationSent?: boolean;
  };
}

export const DEFAULT_VOICEBOX_URL = "http://127.0.0.1:17493";
export const DEFAULT_VOICEBOX_ENGINE = "qwen";
// 0.6B : même note que 1.7B à l'écoute à l'aveugle (4,00 / 5, 18/10/2026), 2,5 fois plus
// rapide (4,8 contre 11,6 s de calcul par seconde de voix sur un M1 Pro).
export const DEFAULT_VOICEBOX_MODEL_SIZE = "0.6B";
export const DEFAULT_VOICEBOX_LANGUAGE = "fr";
/** La consigne de ton par défaut (voix/consigne.ts) ; Ben la change dans Réglages › Voicebox. */
export const DEFAULT_VOICEBOX_INSTRUCT = CONSIGNE_DE_TON_CONSEILLEE;
export { LONGUEUR_MAX_CONSIGNE };

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
    agent: {
      ...current.agent,
      ...partial.agent,
    },
    telemetry: {
      ...current.telemetry,
      ...partial.telemetry,
    },
    veo: {
      ...current.veo,
      ...partial.veo,
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
    !next.voicebox?.language &&
    // La consigne vide (voix neutre) est un choix : son bloc se garde aussi.
    next.voicebox?.instruct === undefined
  ) {
    delete next.voicebox;
  }
  if (!next.agent?.apiKey && !next.agent?.provider && !next.agent?.model) {
    delete next.agent;
  }
  if (!next.veo?.apiKey) {
    delete next.veo;
  }
  if (next.telemetry && Object.keys(next.telemetry).length === 0) {
    delete next.telemetry;
  }
  writeConfigSecure(getConfigPath(), JSON.stringify(next, null, 2));
  return next;
}

/**
 * Écrit le config.json en permissions restreintes (0600 : lecture/écriture
 * propriétaire uniquement). Il contient des secrets (clés API ElevenLabs /
 * agent). `mode` couvre la création ; le `chmodSync` couvre le cas d'un
 * fichier préexistant créé avant ce durcissement. Sur Windows, le bit POSIX
 * n'a pas de sens : le chmod est best-effort et son échec est ignoré
 * silencieusement (no-op gracieux), sans casser la sauvegarde.
 */
export function writeConfigSecure(path: string, data: string): void {
  writeFileSync(path, data, { mode: 0o600 });
  try {
    chmodSync(path, 0o600);
  } catch {
    // Windows / FS sans permissions POSIX : best-effort, on n'échoue pas.
  }
}
