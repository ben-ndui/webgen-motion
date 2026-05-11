"use client";

import { Info, Sliders } from "lucide-react";
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
 * Audio tab — music library in main column, mix volumes in the
 * sticky sidebar at lg+. Library + volumes both feed the compose
 * pass's amix filter graph, so they live next to each other.
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
  const volumesCard = (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-zinc-900" />
          <h3 className="text-sm font-semibold text-slate-900 leading-tight">
            Volumes du mix
          </h3>
        </div>
        <button
          type="button"
          title={
            "Niveaux passés au mix ffmpeg pendant le compose.\nMusique de fond : 0.18 par défaut, auto-ducké à 0.10 quand une voix off est présente.\nVoix off : 1.0 par défaut, jusqu'à 1.5 pour booster, 0.6 pour atténuer."
          }
          aria-label="À propos du mix audio"
          className="flex-shrink-0 text-slate-400 hover:text-slate-700 transition-colors cursor-help"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>
      <Slider
        label="Volume musique"
        value={bgMusicVolume}
        onChange={(v) => onVolumesChange(v, voVolume)}
      />
      <Slider
        label="Volume voix off"
        value={voVolume}
        onChange={(v) => onVolumesChange(bgMusicVolume, v)}
      />
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] 2xl:grid-cols-[1fr_360px] gap-6">
      <div className="space-y-6 min-w-0">
        {/* Volumes inline at md- (sidebar takes them at lg+) */}
        <div className="lg:hidden">{volumesCard}</div>

        <MusicLibrary
          tracks={tracks}
          bgMusicId={bgMusicId}
          onBgMusicChange={onBgMusicChange}
          onTracksChanged={onTracksChanged}
          tourBgMusic={tourBgMusic}
        />
      </div>

      {/* Sticky sidebar (lg+) — mix volumes */}
      <aside className="hidden lg:block lg:sticky lg:top-6 self-start">
        {volumesCard}
      </aside>
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
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
        className="w-full accent-zinc-900 cursor-pointer"
      />
    </div>
  );
}
