"use client";

import { Sliders } from "lucide-react";
import MusicLibrary, { type AudioTrack } from "./music-library";

interface Props {
  tracks: AudioTrack[];
  bgMusicId: string | undefined;
  onBgMusicChange: (next: string | undefined) => void;
  onTracksChanged: () => void;
  tourBgMusic?: string;
  bgMusicVolume: number;
  voVolume: number;
  onVolumesChange: (bg: number, vo: number) => void;
}

/**
 * Audio tab — library on top, volume sliders below.
 * Music + VO live together here because they both feed the compose
 * pass's amix filter graph.
 */
export default function AudioTab({
  tracks,
  bgMusicId,
  onBgMusicChange,
  onTracksChanged,
  tourBgMusic,
  bgMusicVolume,
  voVolume,
  onVolumesChange,
}: Props) {
  return (
    <div className="space-y-6">
      <MusicLibrary
        tracks={tracks}
        bgMusicId={bgMusicId}
        onBgMusicChange={onBgMusicChange}
        onTracksChanged={onTracksChanged}
        tourBgMusic={tourBgMusic}
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sliders className="w-4 h-4 text-zinc-900" />
          <h3 className="text-sm font-semibold text-slate-900">
            Volumes du mix
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Slider
            label="Volume musique"
            value={bgMusicVolume}
            onChange={(v) => onVolumesChange(v, voVolume)}
            hint="0.18 par défaut · auto-ducké à 0.10 si VO présente"
          />
          <Slider
            label="Volume voix off"
            value={voVolume}
            onChange={(v) => onVolumesChange(bgMusicVolume, v)}
            hint="1.0 par défaut · jusqu'à 1.5 pour boost · 0.6 atténuation"
          />
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">
          {label}
        </p>
        <p className="text-xs font-mono text-slate-900">{value.toFixed(2)}</p>
      </div>
      <input
        type="range"
        min={0}
        max={1.5}
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-zinc-900"
      />
      {hint && (
        <p className="text-[10px] text-slate-500 leading-relaxed">{hint}</p>
      )}
    </div>
  );
}
