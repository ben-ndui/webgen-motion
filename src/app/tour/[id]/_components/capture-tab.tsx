"use client";

import {
  AlertCircle,
  Info,
  Monitor,
  Smartphone,
  Sparkles,
  Video,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { useState } from "react";
import PhaseLoader, { type RunningProgress } from "./phase-loader";
import SectionCard from "./section-card";
import SectionLightbox from "./section-lightbox";

export interface CapturedSection {
  index: number;
  categoryId: string;
  title: string;
  subtitle?: string;
  mp4Url: string;
  durationSec: number;
  sizeBytes: number;
  frames: number;
  /** Optional trim in/out points persisted to manifest by the UI
   *  trim controls (Sprint UX post-capture · Phase 3). Both in
   *  seconds, relative to MP4 start. When absent, full clip plays. */
  trimStartSec?: number;
  trimEndSec?: number;
}

export type CaptureState =
  | { kind: "idle" }
  | { kind: "running"; progress: RunningProgress }
  | {
      kind: "ready";
      sections: CapturedSection[];
      totalDurationSec: number;
      totalSizeBytes: number;
      captureWallTimeSec: number;
    }
  | { kind: "error"; message: string };

interface Props {
  capture: CaptureState;
  captureFormat: "16:9" | "9:16";
  tourId: string;
  onCapture: () => void;
  /** Appelé quand une section a été recapturée — le parent doit
   *  refetch le manifest pour rafraîchir les cards (Sprint UX
   *  post-capture · Phase 1). */
  onSectionRecaptured: () => void;
}

export default function CaptureTab({
  capture,
  captureFormat,
  tourId,
  onCapture,
  onSectionRecaptured,
}: Props) {
  const isRunning = capture.kind === "running";

  const captureDescription = `Puppeteer ouvre une fenêtre Chromium au format ${captureFormat}, film le tour section par section et encode chaque section en MP4 + manifest.json.\nSortie : ~/.webgen-motion/tours/${tourId}/`;

  const actionCard = (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-1">
            Action
          </p>
          <h2 className="text-sm font-semibold text-slate-900 leading-tight">
            Capturer en MP4
          </h2>
          <p className="text-[11px] font-mono text-slate-500 mt-1">
            Format : <span className="text-slate-900">{captureFormat}</span>
          </p>
        </div>
        <button
          type="button"
          title={captureDescription}
          aria-label="À propos de la capture"
          className="flex-shrink-0 text-slate-400 hover:text-slate-700 transition-colors cursor-help"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>
      <button
        onClick={onCapture}
        disabled={isRunning}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-60 disabled:cursor-progress"
      >
        {isRunning ? (
          <>
            <Sparkles className="w-4 h-4 animate-pulse" />
            Capture · {capture.progress.sinceSec}s
          </>
        ) : (
          <>
            {captureFormat === "9:16" ? (
              <Smartphone className="w-4 h-4" />
            ) : (
              <Monitor className="w-4 h-4" />
            )}
            Capturer en MP4
          </>
        )}
      </button>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] 2xl:grid-cols-[1fr_360px] gap-6">
      <div className="space-y-6 min-w-0">
        {/* Action inline at md- (sidebar takes it at lg+) */}
        <div className="lg:hidden">{actionCard}</div>

        {/* Phase loader */}
        <AnimatePresence>
          {capture.kind === "running" && (
            <PhaseLoader progress={capture.progress} variant="capture" />
          )}
        </AnimatePresence>

        {/* Error */}
        {capture.kind === "error" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-rose-200 bg-rose-50 p-4 flex items-start gap-3"
          >
            <AlertCircle
              className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600"
              strokeWidth={2.5}
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-rose-900">
                Capture échouée
              </p>
              <p className="text-xs font-mono mt-1 text-rose-700 break-words whitespace-pre-wrap">
                {capture.message}
              </p>
            </div>
          </motion.div>
        )}

        {/* Sections grid */}
        {capture.kind === "ready" && (
          <CaptureResults
            sections={capture.sections}
            totalDurationSec={capture.totalDurationSec}
            totalSizeBytes={capture.totalSizeBytes}
            captureWallTimeSec={capture.captureWallTimeSec}
            tourId={tourId}
            onSectionRecaptured={onSectionRecaptured}
          />
        )}

        {capture.kind === "idle" && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-8 py-16 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-900 text-white mb-4">
              <Video className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">
              Prêt à filmer
            </h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              Vérifie le format dans le tab <strong>Script</strong> puis clique{" "}
              <strong>Capturer en MP4</strong>. Une fenêtre Chromium s&apos;ouvre,
              joue le script et écrit les sections sur ton disque.
            </p>
          </div>
        )}
      </div>

      {/* Sidebar (lg+) — action card sticky */}
      <aside className="hidden lg:block lg:sticky lg:top-6 self-start">
        {actionCard}
      </aside>
    </div>
  );
}

function CaptureResults({
  sections,
  totalDurationSec,
  totalSizeBytes,
  captureWallTimeSec,
  tourId,
  onSectionRecaptured,
}: {
  sections: CapturedSection[];
  totalDurationSec: number;
  totalSizeBytes: number;
  captureWallTimeSec: number;
  tourId: string;
  onSectionRecaptured: () => void;
}) {
  const [zoom, setZoom] = useState<CapturedSection | null>(null);
  // Drag & drop reorder — Sprint UX post-capture · Phase 2.
  // On manipule un état local pour l'optimistic update + on appelle
  // /api/motion/tour/reorder-sections/run pour persister.
  const [dragSrc, setDragSrc] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);

  const handleDrop = async (srcIdx: number, destIdx: number) => {
    if (srcIdx === destIdx) return;
    // Reconstruit le nouvel ordre. On enlève srcIdx du tableau et on
    // l'insère à la position destIdx.
    const order = sections.map((s) => s.index);
    const src = order.splice(srcIdx, 1)[0];
    order.splice(destIdx, 0, src);
    try {
      const res = await fetch("/api/motion/tour/reorder-sections/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tourId, order }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setReorderError(null);
      onSectionRecaptured(); // reuse the manifest-refetch callback
    } catch (e) {
      setReorderError((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm font-semibold text-slate-900">
          {sections.length} section{sections.length > 1 ? "s" : ""} capturée
          {sections.length > 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
          <Stat value={`${totalDurationSec.toFixed(1)}s`} />
          <Sep />
          <Stat value={`${(totalSizeBytes / 1024 / 1024).toFixed(1)} MB`} />
          <Sep />
          <Stat value={`${captureWallTimeSec}s wall`} />
        </div>
      </div>

      {reorderError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
          Erreur reorder : {reorderError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {sections.map((s, idx) => (
          <SectionCard
            key={s.index}
            section={s}
            tourId={tourId}
            idx={idx}
            onZoom={setZoom}
            onSectionRecaptured={onSectionRecaptured}
            isDragging={dragSrc === idx}
            isDropTarget={dropTarget === idx && dragSrc !== idx}
            onDragStart={() => setDragSrc(idx)}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragSrc !== null && dragSrc !== idx) setDropTarget(idx);
            }}
            onDragLeave={() => setDropTarget((t) => (t === idx ? null : t))}
            onDrop={() => {
              if (dragSrc !== null && dragSrc !== idx) handleDrop(dragSrc, idx);
              setDragSrc(null);
              setDropTarget(null);
            }}
            onDragEnd={() => {
              setDragSrc(null);
              setDropTarget(null);
            }}
          />
        ))}
      </div>

      <SectionLightbox section={zoom} onClose={() => setZoom(null)} />
    </div>
  );
}

function Stat({ value }: { value: string }) {
  return <span className="text-slate-900">{value}</span>;
}
function Sep() {
  return <span className="text-slate-300">·</span>;
}
