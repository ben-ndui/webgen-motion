"use client";

import "../../../editor.css";
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
 * Audio tab — handoff layout (Phase 4). Music library (left) + mix card
 * (right, sticky) feeding the compose amix graph. Real upload/select/
 * delete (MusicLibrary) + real volume handlers preserved.
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
    <div className="gm-editor" data-wm-id="editor.audio">
      <div className="panel">
        <div className="panel-head">
          <div>
            <span className="kicker">Onglet 03</span>
            <h2 className="panel-title">Audio</h2>
            <p className="panel-sub">
              Choisissez une piste musicale et équilibrez les volumes. La musique est
              auto-duckée sous la voix off au compose.
            </p>
          </div>
        </div>

        <div className="two-col">
          <div className="min-w-0" data-wm-id="editor.audio.library">
            <MusicLibrary
              tracks={tracks}
              bgMusicId={bgMusicId}
              onBgMusicChange={onBgMusicChange}
              onTracksChanged={onTracksChanged}
              tourBgMusic={tourBgMusic}
            />
          </div>

          <aside className="side-card vol-card" data-wm-id="editor.audio.mix">
            <h4>Mixage</h4>
            <VolRow
              label="Volume musique"
              value={bgMusicVolume}
              onChange={(v) => onVolumesChange(v, voVolume)}
            />
            <VolRow
              label="Volume voix off"
              value={voVolume}
              onChange={(v) => onVolumesChange(bgMusicVolume, v)}
            />
            <p className="text-xs text-faint leading-relaxed">
              Défaut : musique 0.18 (duckée à 0.10 sous la voix), voix off 1.00.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}

function VolRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="vol-row">
      <div className="vh">
        <span className="vl">{label}</span>
        <span className="vv">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={1.5}
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label={label}
      />
    </div>
  );
}
