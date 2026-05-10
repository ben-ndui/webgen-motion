"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Music,
  Upload,
  Trash2,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";

export interface AudioTrack {
  id: string;
  originalName: string;
  filename: string;
  sizeBytes: number;
  durationSec: number;
  uploadedAt: string;
}

interface Props {
  tracks: AudioTrack[];
  /** undefined = use catalogue default, "" = explicit no-music, "<id>" = library track */
  bgMusicId: string | undefined;
  onBgMusicChange: (next: string | undefined) => void;
  onTracksChanged: () => void;
  /** Catalogue default (informational badge). */
  tourBgMusic?: string;
}

export default function MusicLibrary({
  tracks,
  bgMusicId,
  onBgMusicChange,
  onTracksChanged,
  tourBgMusic,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/motion/audio", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setUploadErr(data.error || `HTTP ${res.status}`);
        return;
      }
      onTracksChanged();
      onBgMusicChange(data.track.id);
    } catch (e) {
      setUploadErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/motion/audio/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      onTracksChanged();
      if (bgMusicId === id) onBgMusicChange(undefined);
    } catch {}
  };

  const usingDefault = bgMusicId === undefined;
  const usingNone = bgMusicId === "";
  const usingTrackId = bgMusicId && bgMusicId !== "" ? bgMusicId : null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Music className="w-4 h-4 text-zinc-900" />
          <h3 className="text-sm font-semibold text-slate-900">
            Musique de fond
          </h3>
          {usingDefault && tourBgMusic && (
            <span
              className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700"
              title={`Default catalogue : ${tourBgMusic}`}
            >
              défaut catalogue
            </span>
          )}
          {usingNone && (
            <span className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
              sans musique
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Pill
            active={usingNone}
            onClick={() => onBgMusicChange("")}
            label="Aucune"
          />
          <Pill
            active={usingDefault}
            onClick={() => onBgMusicChange(undefined)}
            label="Défaut"
            hint="Réutilise tour.bgMusic du catalogue"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/mp3,audio/mpeg,audio/wav,audio/m4a,audio/aac,audio/ogg,.mp3,.wav,.m4a,.aac,.ogg"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 transition-colors disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Upload className="w-3 h-3" />
            )}
            Upload
          </button>
        </div>
      </div>

      {tracks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
          <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
            Aucun morceau dans la librairie. Upload un MP3 / WAV / M4A
            (royalty-free, ≤ 25 MB) ou laisse{" "}
            <code className="font-mono text-slate-700">tour.bgMusic</code> du
            catalogue prendre le relais.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {tracks.map((t) => {
            const selected = usingTrackId === t.id;
            return (
              <motion.div
                key={t.id}
                onClick={() => onBgMusicChange(t.id)}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  selected
                    ? "border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900/10"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-lg grid place-items-center flex-shrink-0 ${
                    selected
                      ? "bg-zinc-900 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {selected ? (
                    <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                  ) : (
                    <Music className="w-3.5 h-3.5" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {t.originalName}
                  </p>
                  <p className="text-[11px] font-mono text-slate-500 truncate">
                    {t.durationSec > 0 ? `${formatDur(t.durationSec)} · ` : ""}
                    {(t.sizeBytes / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
                <audio
                  src={`/api/motion/audio/${encodeURIComponent(t.id)}/stream`}
                  controls
                  preload="none"
                  className="h-7 max-w-[240px]"
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (
                      window.confirm(
                        `Supprimer "${t.originalName}" de la librairie ?`,
                      )
                    ) {
                      handleDelete(t.id);
                    }
                  }}
                  className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      {uploadErr && (
        <div className="flex items-start gap-2 p-2 rounded-lg bg-rose-50 border border-rose-200">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-rose-600" />
          <p className="text-xs font-mono text-rose-800">{uploadErr}</p>
        </div>
      )}
    </div>
  );
}

function Pill({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={hint}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
        active
          ? "bg-zinc-900 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

function formatDur(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
