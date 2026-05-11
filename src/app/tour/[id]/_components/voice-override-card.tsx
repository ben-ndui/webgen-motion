"use client";

import type { TourEntry } from "@/lib/types/tour";

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

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
      <div>
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-1">
          Voix off — override par tour
        </p>
        <p className="hidden sm:block text-[11px] text-slate-500 leading-relaxed">
          Backend cloud (ElevenLabs) ou local (Voicebox). Laisse vide les
          autres champs pour utiliser la config globale du wizard.
        </p>
      </div>

      {/* Backend toggle */}
      <div>
        <p className="text-[10px] uppercase tracking-wider font-mono text-slate-500 mb-1.5">
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
            <span className="text-[10px] uppercase tracking-wider font-mono text-slate-500">
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
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider font-mono text-slate-500">
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
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </label>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider font-mono text-slate-500">
              Profile UUID
            </span>
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
              placeholder="profile id global"
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider font-mono text-slate-500">
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
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
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
              <span className="text-[10px] uppercase tracking-wider font-mono text-slate-500">
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
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
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
      <div className="pt-2 border-t border-slate-100 space-y-2.5">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">
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
            <span className="text-[10px] uppercase tracking-wider font-mono text-slate-500 block">
              Speaker boost
            </span>
            <span className="hidden sm:inline text-[10px] text-slate-400">
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
            className="h-4 w-4 accent-zinc-900"
          />
        </label>
        <button
          onClick={() => onChange({ ...tour, voiceSettings: undefined })}
          className="w-full text-[10px] font-mono uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors py-1"
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
        <span className="text-[10px] uppercase tracking-wider font-mono text-slate-500">
          {label}
        </span>
        <span className="text-[10px] font-mono text-slate-700">
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
        className="w-full h-1 mt-1 accent-zinc-900 cursor-pointer"
      />
      <p className="hidden sm:block text-[10px] text-slate-400 mt-0.5">{hint}</p>
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
          ? "border-zinc-900 bg-zinc-900 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      <span className="text-xs font-semibold">{label}</span>
      <span
        className={`text-[9px] font-mono uppercase tracking-wider ${active ? "text-white/70" : "text-slate-500"}`}
      >
        {hint}
      </span>
    </button>
  );
}
