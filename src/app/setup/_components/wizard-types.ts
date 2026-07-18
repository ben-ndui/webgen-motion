/**
 * Types partagés entre les step components du Setup wizard.
 *
 * Extrait de `page.tsx` (ex-1018 lignes) pendant le sprint refactor
 * wizard. Vit dans `_components/` à côté des step files qui les
 * consomment.
 */

export interface PublicConfig {
  defaultBackend: "elevenlabs" | "voicebox" | "google";
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
  google: {
    voice: string;
    languageCode: string;
    credentialsPath: string | null;
    hasCredentials: boolean;
  };
  envFallback: {
    hasApiKey: boolean;
    hasVoiceId: boolean;
  };
  configured: boolean;
  /** Télémétrie d'activation anonyme (opt-out). Default true. */
  telemetryEnabled: boolean;
}

export interface VoiceboxProfile {
  id: string;
  name: string;
  language: string | null;
  voice_type: string | null;
  default_engine: string | null;
  sample_count: number;
  description: string | null;
}

export type WizardStep =
  | "welcome"
  | "backend"
  | "elevenlabs"
  | "voicebox"
  | "google"
  | "done";
