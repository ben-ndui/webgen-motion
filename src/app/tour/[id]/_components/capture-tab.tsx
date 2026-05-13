"use client";

import {
  AlertCircle,
  Download,
  Expand,
  Info,
  Monitor,
  Smartphone,
  Sparkles,
  Video,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { getCategory } from "@/lib/motion-categories";
import PhaseLoader, { type RunningProgress } from "./phase-loader";
import RecaptureSectionButton from "./recapture-section-button";

export interface CapturedSection {
  index: number;
  categoryId: string;
  title: string;
  subtitle?: string;
  mp4Url: string;
  durationSec: number;
  sizeBytes: number;
  frames: number;
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {sections.map((s) => {
          const cat = getCategory(s.categoryId);
          const accent = cat?.bgColor ?? "#0f172a";
          return (
            <motion.div
              key={s.index}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: s.index * 0.04 }}
              className="rounded-2xl border border-slate-200 bg-white overflow-hidden hover:border-slate-300 hover:shadow-md transition-all"
            >
              <div
                className="h-1.5"
                style={{ backgroundColor: accent }}
              />
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: `${accent}15`, color: accent }}
                  >
                    {String(s.index).padStart(2, "0")} · {cat?.label ?? "—"}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-slate-900 leading-tight">
                  {s.title}
                </h4>
                {s.subtitle && (
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                    {s.subtitle}
                  </p>
                )}
                <div className="flex items-center gap-1.5 mt-2 text-[11px] font-mono text-slate-400">
                  <span>{s.durationSec.toFixed(1)}s</span>
                  <span>·</span>
                  <span>{(s.sizeBytes / 1024 / 1024).toFixed(1)} MB</span>
                  <span>·</span>
                  <span>{s.frames}f</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setZoom(s)}
                className="relative group w-full bg-black block overflow-hidden cursor-zoom-in"
                aria-label="Agrandir la capture"
              >
                <video
                  src={s.mp4Url}
                  className="w-full block pointer-events-none"
                  muted
                  preload="metadata"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/95 text-zinc-900 text-xs font-medium">
                    <Expand className="w-3 h-3" />
                    Agrandir
                  </span>
                </div>
              </button>
              <div className="p-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                <RecaptureSectionButton
                  tourId={tourId}
                  sectionIndex={s.index}
                  onDone={onSectionRecaptured}
                />
                <a
                  href={s.mp4Url}
                  download={`webgen-${tourId}-section-${String(s.index).padStart(2, "0")}.mp4`}
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 transition-colors px-2 py-1 rounded-md hover:bg-slate-100"
                >
                  <Download className="w-3 h-3" />
                  MP4
                </a>
              </div>
            </motion.div>
          );
        })}
      </div>

      <SectionLightbox section={zoom} onClose={() => setZoom(null)} />
    </div>
  );
}

function SectionLightbox({
  section,
  onClose,
}: {
  section: CapturedSection | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!section) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [section, onClose]);
  return (
    <AnimatePresence>
      {section && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={onClose}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-6xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-white mb-3">
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/60">
                Section {String(section.index).padStart(2, "0")} · {section.categoryId}
              </p>
              <h3 className="text-lg font-semibold mt-0.5">{section.title}</h3>
              {section.subtitle && (
                <p className="text-sm text-white/70 mt-0.5">{section.subtitle}</p>
              )}
            </div>
            <video
              src={section.mp4Url}
              controls
              autoPlay
              className="w-full bg-black rounded-lg shadow-2xl"
            />
            <div className="text-xs text-white/50 mt-3 font-mono flex items-center gap-2">
              <span>{section.durationSec.toFixed(1)}s</span>
              <span>·</span>
              <span>{(section.sizeBytes / 1024 / 1024).toFixed(1)} MB</span>
              <span>·</span>
              <span>{section.frames}f</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stat({ value }: { value: string }) {
  return <span className="text-slate-900">{value}</span>;
}
function Sep() {
  return <span className="text-slate-300">·</span>;
}
