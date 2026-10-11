/**
 * Le moteur de voix partagé par les tours (scripts/audio-tour.ts) et les
 * films de marque : trois fournisseurs (Google, ElevenLabs, Voicebox), un
 * cache disque par texte, la prononciation appliquée avant tout envoi.
 * SERVEUR SEULEMENT. Extrait tel quel de audio-tour.ts (11/10/2026) : les
 * réglages qui y étaient globaux passent en paramètres.
 */

/**
 * Character-level alignment returned by ElevenLabs
 * `/with-timestamps`. Indices in the three arrays are aligned : the
 * Nth character starts at `character_start_times_seconds[N]` and ends
 * at `character_end_times_seconds[N]`. Whitespace + punctuation are
 * included as their own characters.
 */
export interface ElevenLabsAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

/** Effective ElevenLabs voice settings — tour override merged with defaults. */
export interface EffectiveVoiceSettings {
  stability: number;
  similarityBoost: number;
  style: number;
  useSpeakerBoost: boolean;
}

export const DEFAULT_VOICE_SETTINGS: EffectiveVoiceSettings = {
  stability: 0.55,
  similarityBoost: 0.78,
  style: 0.12,
  useSpeakerBoost: true,
};
