"use client";

import type { TourEntry } from "@/lib/types/tour";

/**
 * Voice override card — per-tour overrides for ElevenLabs voice id,
 * model, and voice_settings sliders. Rendered in the Voice tab so all
 * voice-off concerns live in one place.
 */
export default function VoiceOverrideCard({
  tour,
  onChange,
}: {
  tour: TourEntry;
  onChange: (next: TourEntry) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
      <div>
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-1">
          Voix off — override par tour
        </p>
        <p className="hidden sm:block text-[11px] text-slate-500 leading-relaxed">
          Laisse vide pour utiliser la config globale (Setup wizard / .env).
          Utile quand plusieurs projets partagent une install mais ont
          chacun leur voix clonée.
        </p>
      </div>
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
