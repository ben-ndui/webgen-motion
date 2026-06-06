"use client";

import { useEffect, useState } from "react";
import type { TourEntry } from "@/lib/types/tour";

interface VoiceboxProfile {
  id: string;
  name: string;
  language: string | null;
  voice_type: string | null;
  default_engine: string | null;
  sample_count: number;
  description: string | null;
}

type ProfilesState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "loaded"; profiles: VoiceboxProfile[]; url: string }
  | { kind: "error"; message: string; url: string };

/**
 * Voice override card — per-tour TTS backend + voice id / settings.
 * Rendered in the Voice tab so all voice-off concerns live in one
 * place. The backend toggle drives the rest of the form so users
 * never see fields irrelevant to the chosen backend.
 */
export default function VoiceOverrideCard({
  tour,
  onChange,
}: {
  tour: TourEntry;
  onChange: (next: TourEntry) => void;
}) {
  // Falls back to global default — UI label says "(global)" when the
  // tour itself doesn't pin a backend, but we still show the active
  // form below so the user can see what's effectively going to run.
  const effectiveBackend = tour.voiceBackend ?? "elevenlabs";

  // Auto-fetch Voicebox profiles when the user switches to Voicebox
  // so they can pick from a dropdown instead of pasting UUIDs by
  // hand. Refetched on demand via the refresh button.
  const [profilesState, setProfilesState] = useState<ProfilesState>({
    kind: "idle",
  });
  const fetchProfiles = async () => {
    setProfilesState({ kind: "loading" });
    try {
      const res = await fetch("/api/motion/voicebox/profiles");
      const data = (await res.json()) as
        | {
            url: string;
            profiles: VoiceboxProfile[];
          }
        | { url: string; error: string };
      if (!res.ok || "error" in data) {
        setProfilesState({
          kind: "error",
          message: "error" in data ? data.error : `HTTP ${res.status}`,
          url: data.url ?? "",
        });
        return;
      }
      setProfilesState({
        kind: "loaded",
        profiles: data.profiles,
        url: data.url,
      });
    } catch (e) {
      setProfilesState({
        kind: "error",
        message: e instanceof Error ? e.message : "Network error",
        url: "",
      });
    }
  };
  useEffect(() => {
    if (effectiveBackend === "voicebox" && profilesState.kind === "idle") {
      fetchProfiles();
    }
  }, [effectiveBackend, profilesState.kind]);

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 space-y-3">
      <div>
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted mb-1">
          Voix off — override par tour
        </p>
        <p className="hidden sm:block text-[11px] text-muted leading-relaxed">
          Backend cloud (ElevenLabs) ou local (Voicebox). Laisse vide les
          autres champs pour utiliser la config globale du wizard.
        </p>
      </div>

      {/* Backend toggle */}
      <div>
        <p className="text-[10px] uppercase tracking-wider font-mono text-muted mb-1.5">
          Backend
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          <BackendPill
            active={effectiveBackend === "elevenlabs"}
            label="ElevenLabs"
            hint="Cloud"
            onClick={() =>
              onChange({ ...tour, voiceBackend: "elevenlabs" })
            }
          />
          <BackendPill
            active={effectiveBackend === "voicebox"}
            label="Voicebox"
            hint="Local"
            onClick={() => onChange({ ...tour, voiceBackend: "voicebox" })}
          />
        </div>
      </div>

      {effectiveBackend === "elevenlabs" ? (
        <div className="space-y-2">
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider font-mono text-muted">
              Voice ID
            </span>
            <input
              type="text"
              value={tour.voiceId ?? ""}
              onChange={(e) =>
                onChange({
                  ...tour,
                  voiceId:
                    e.target.value.trim().length > 0
                      ? e.target.value
                      : undefined,
                })
              }
              placeholder="ELEVENLABS_VOICE_ID (global)"
              className="mt-1 w-full rounded-lg border border-line-strong px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider font-mono text-muted">
              Model
            </span>
            <input
              type="text"
              value={tour.voiceModel ?? ""}
              onChange={(e) =>
                onChange({
                  ...tour,
                  voiceModel:
                    e.target.value.trim().length > 0
                      ? e.target.value
                      : undefined,
                })
              }
              placeholder="eleven_multilingual_v2"
              className="mt-1 w-full rounded-lg border border-line-strong px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </label>
        </div>
      ) : (
        <div className="space-y-2">
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[10px] uppercase tracking-wider font-mono text-muted">
                Voix
              </span>
              <button
                type="button"
                onClick={fetchProfiles}
                className="text-[10px] font-mono text-muted hover:text-ink"
                title="Rafraîchir la liste depuis Voicebox"
              >
                ↻ Refresh
              </button>
            </div>
            {profilesState.kind === "loading" && (
              <p className="text-[10px] font-mono text-muted px-2 py-1.5 bg-bg-sunken rounded-md">
                Chargement des profils Voicebox…
              </p>
            )}
            {profilesState.kind === "error" && (
              <div className="space-y-1.5">
                <p className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-2 py-1.5 leading-relaxed">
                  {profilesState.message}
                </p>
                <input
                  type="text"
                  value={tour.voiceboxProfileId ?? ""}
                  onChange={(e) =>
                    onChange({
                      ...tour,
                      voiceboxProfileId:
                        e.target.value.trim().length > 0
                          ? e.target.value
                          : undefined,
                    })
                  }
                  placeholder="profile UUID (fallback)"
                  className="w-full rounded-lg border border-line-strong px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            )}
            {profilesState.kind === "loaded" && (
              <>
                {profilesState.profiles.length === 0 ? (
                  <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 leading-relaxed">
                    Aucune voix dans Voicebox — crée-en une dans l&apos;app
                    desktop puis clique Refresh.
                  </p>
                ) : (
                  <select
                    value={tour.voiceboxProfileId ?? ""}
                    onChange={(e) =>
                      onChange({
                        ...tour,
                        voiceboxProfileId:
                          e.target.value.length > 0
                            ? e.target.value
                            : undefined,
                      })
                    }
                    className="w-full rounded-lg border border-line-strong px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-accent bg-surface"
                  >
                    <option value="">
                      — Voix globale (config wizard) —
                    </option>
                    {profilesState.profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.language ? ` · ${p.language}` : ""}
                        {p.voice_type ? ` · ${p.voice_type}` : ""}
                      </option>
                    ))}
                  </select>
                )}
                <p className="hidden sm:block text-[10px] text-faint mt-0.5">
                  {profilesState.profiles.length} voix · {profilesState.url}
                </p>
              </>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider font-mono text-muted">
                Engine
              </span>
              <select
                value={tour.voiceboxEngine ?? ""}
                onChange={(e) =>
                  onChange({
                    ...tour,
                    voiceboxEngine: e.target.value || undefined,
                  })
                }
                className="mt-1 w-full rounded-lg border border-line-strong px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-accent bg-surface"
              >
                <option value="">global</option>
                <option value="qwen">qwen</option>
                <option value="qwen_custom_voice">qwen_custom_voice</option>
                <option value="kokoro">kokoro</option>
                <option value="chatterbox">chatterbox</option>
                <option value="chatterbox_turbo">chatterbox_turbo</option>
                <option value="luxtts">luxtts</option>
                <option value="tada">tada</option>
              </select>
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider font-mono text-muted">
                Size
              </span>
              <select
                value={tour.voiceboxModelSize ?? ""}
                onChange={(e) =>
                  onChange({
                    ...tour,
                    voiceboxModelSize: e.target.value || undefined,
                  })
                }
                className="mt-1 w-full rounded-lg border border-line-strong px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-accent bg-surface"
              >
                <option value="">global</option>
                <option value="0.6B">0.6B</option>
                <option value="1B">1B</option>
                <option value="1.7B">1.7B</option>
                <option value="3B">3B</option>
              </select>
            </label>
          </div>
          <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 leading-relaxed">
            ⚠ Mode <strong>narrative</strong> non supporté avec Voicebox
            tant que le forced-alignment local (chunk A1.1) n&apos;est pas
            livré — passe en per-step ou utilise ElevenLabs pour les
            tours narratifs.
          </p>
        </div>
      )}

      {/* Voice settings sliders */}
      <div className="pt-2 border-t border-line-soft space-y-2.5">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">
          Réglages ElevenLabs
        </p>
        <VoiceSlider
          label="Stability"
          hint="Bas = expressif, haut = stable. 0.55 conseillé."
          value={tour.voiceSettings?.stability ?? 0.55}
          onChange={(v) => updateVoiceSettings(tour, onChange, { stability: v })}
        />
        <VoiceSlider
          label="Similarity"
          hint="Fidélité à la voix clonée. 0.78 par défaut."
          value={tour.voiceSettings?.similarityBoost ?? 0.78}
          onChange={(v) =>
            updateVoiceSettings(tour, onChange, { similarityBoost: v })
          }
        />
        <VoiceSlider
          label="Style"
          hint="Coloration émotionnelle. 0.12 conseillé."
          value={tour.voiceSettings?.style ?? 0.12}
          onChange={(v) => updateVoiceSettings(tour, onChange, { style: v })}
        />
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase tracking-wider font-mono text-muted block">
              Speaker boost
            </span>
            <span className="hidden sm:inline text-[10px] text-faint">
              Renforce le timbre du speaker
            </span>
          </div>
          <input
            type="checkbox"
            checked={tour.voiceSettings?.useSpeakerBoost ?? true}
            onChange={(e) =>
              updateVoiceSettings(tour, onChange, {
                useSpeakerBoost: e.target.checked,
              })
            }
            className="h-4 w-4 accent-[var(--accent)]"
          />
        </label>
        <button
          onClick={() => onChange({ ...tour, voiceSettings: undefined })}
          className="w-full text-[10px] font-mono uppercase tracking-wider text-muted hover:text-ink transition-colors py-1"
          title="Reset aux valeurs par défaut"
        >
          ↻ Reset
        </button>
      </div>
    </div>
  );
}

function updateVoiceSettings(
  tour: TourEntry,
  onChange: (next: TourEntry) => void,
  patch: Partial<NonNullable<TourEntry["voiceSettings"]>>,
): void {
  const next = { ...(tour.voiceSettings ?? {}), ...patch };
  const allEmpty =
    next.stability === undefined &&
    next.similarityBoost === undefined &&
    next.style === undefined &&
    next.useSpeakerBoost === undefined;
  onChange({ ...tour, voiceSettings: allEmpty ? undefined : next });
}

function VoiceSlider({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-wider font-mono text-muted">
          {label}
        </span>
        <span className="text-[10px] font-mono text-ink-soft">
          {value.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 mt-1 accent-[var(--accent)] cursor-pointer"
      />
      <p className="hidden sm:block text-[10px] text-faint mt-0.5">{hint}</p>
    </div>
  );
}

function BackendPill({
  active,
  label,
  hint,
  onClick,
}: {
  active: boolean;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-0.5 px-2.5 py-2 rounded-lg border text-left transition-colors ${
        active
          ? "border-accent bg-ink text-bg"
          : "border-line bg-surface text-ink-soft hover:bg-bg-sunken"
      }`}
    >
      <span className="text-xs font-semibold">{label}</span>
      <span
        className={`text-[9px] font-mono uppercase tracking-wider ${active ? "text-bg/70" : "text-muted"}`}
      >
        {hint}
      </span>
    </button>
  );
}
