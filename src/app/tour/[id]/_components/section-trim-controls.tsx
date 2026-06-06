"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Scissors } from "lucide-react";

/**
 * Trim in/out non-destructif pour une section capturée.
 * Sprint UX post-capture · Phase 3.
 *
 * Le slider est un dual-handle implémenté en deux `<input
 * type="range">` superposés — pas de dep externe nécessaire. La
 * "track" entre les deux handles est un span absolument positionné
 * qui se redimensionne dynamiquement.
 *
 * Live preview : la <video> à droite seeks sur le start / end
 * quand on bouge le handle correspondant, pour que l'utilisateur
 * voie EXACTEMENT le frame où le cut se fait.
 *
 * Non-destructif : on persiste juste {trimStartSec, trimEndSec}
 * dans le manifest via /api/motion/tour/trim-section/run.
 * Compose-tour applique le trim via OffthreadVideo startFrom +
 * endAt au moment du render. Reset = retire les champs du
 * manifest, le full clip joue à nouveau.
 */
export default function SectionTrimControls({
  tourId,
  sectionIndex,
  mp4Url,
  capturedDurationSec,
  initialTrimStartSec,
  initialTrimEndSec,
  onSaved,
  onClose,
}: {
  tourId: string;
  sectionIndex: number;
  mp4Url: string;
  capturedDurationSec: number;
  initialTrimStartSec?: number;
  initialTrimEndSec?: number;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [start, setStart] = useState(initialTrimStartSec ?? 0);
  const [end, setEnd] = useState(initialTrimEndSec ?? capturedDurationSec);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Live preview : seek la vidéo au start quand on bouge ce handle,
  // au end-0.1s quand on bouge l'autre. Donne un retour visuel
  // direct du frame exact où le cut va se faire.
  const seek = (sec: number) => {
    const v = videoRef.current;
    if (!v) return;
    try {
      v.currentTime = Math.max(0, Math.min(sec, capturedDurationSec - 0.01));
    } catch {}
  };

  useEffect(() => {
    seek(start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start]);

  const reset = () => {
    setStart(0);
    setEnd(capturedDurationSec);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/motion/tour/trim-section/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tourId,
          sectionIndex,
          trimStartSec: start,
          trimEndSec: end,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const trimmedSec = end - start;
  const savedSec = capturedDurationSec - trimmedSec;
  // Position en % du début et de la fin pour stylize la fill bar.
  const startPct = (start / capturedDurationSec) * 100;
  const endPct = (end / capturedDurationSec) * 100;

  return (
    <div className="p-3 border-t border-line bg-bg-sunken space-y-3">
      <div className="flex items-center gap-2">
        <Scissors className="w-3.5 h-3.5 text-muted flex-shrink-0" />
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted flex-1">
          Trim
        </p>
        <span className="text-[11px] font-mono text-muted">
          {trimmedSec.toFixed(1)}s
          {savedSec > 0.1 && (
            <span className="text-faint ml-1">
              (-{savedSec.toFixed(1)}s)
            </span>
          )}
        </span>
      </div>

      {/* Preview video — autoplay false, seek-driven only */}
      <video
        ref={videoRef}
        src={mp4Url}
        muted
        className="w-full bg-black rounded-md"
        preload="metadata"
      />

      {/* Dual-range slider */}
      <div className="relative h-7">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 bg-line-strong rounded-full" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1.5 bg-ink rounded-full"
          style={{
            left: `${startPct}%`,
            right: `${100 - endPct}%`,
          }}
        />
        <input
          type="range"
          min={0}
          max={capturedDurationSec}
          step={0.1}
          value={start}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (v < end - 0.2) setStart(v);
          }}
          className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-surface [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-line-strong [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing"
        />
        <input
          type="range"
          min={0}
          max={capturedDurationSec}
          step={0.1}
          value={end}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (v > start + 0.2) {
              setEnd(v);
              seek(Math.max(0, v - 0.1));
            }
          }}
          className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-surface [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-line-strong [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing"
        />
      </div>

      <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-muted">
        <span>{start.toFixed(1)}s</span>
        <span>{end.toFixed(1)}s</span>
      </div>

      {error && (
        <p className="text-[11px] text-rose-700 break-words">{error}</p>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={reset}
          disabled={saving}
          className="text-[11px] font-medium text-muted hover:text-ink px-2 py-1 rounded-md hover:bg-surface-2 transition-colors disabled:opacity-50"
        >
          Reset
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-[11px] text-muted hover:text-ink px-2 py-1 rounded-md transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-bg bg-ink hover:opacity-90 px-3 py-1 rounded-md transition-colors disabled:opacity-60"
          >
            {saving && <Loader2 className="w-3 h-3 animate-spin" />}
            {saving ? "Save…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
