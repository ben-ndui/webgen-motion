"use client";

import {
  AlertCircle,
  Download,
  Monitor,
  Smartphone,
  Sparkles,
  Video,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getCategory } from "@/lib/motion-categories";
import PhaseLoader, { type RunningProgress } from "./phase-loader";

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
}

export default function CaptureTab({
  capture,
  captureFormat,
  tourId,
  onCapture,
}: Props) {
  const isRunning = capture.kind === "running";

  return (
    <div className="space-y-6">
      {/* Action card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-1">
            Action
          </p>
          <h2 className="text-lg font-semibold text-slate-900">
            Capturer le tour en MP4
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Puppeteer ouvre une fenêtre, film section par section au format{" "}
            <span className="font-mono text-slate-900">{captureFormat}</span>,
            encode en MP4 + manifest dans{" "}
            <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">
              ~/.webgen-motion/tours/{tourId}/
            </code>
            .
          </p>
        </div>
        <button
          onClick={onCapture}
          disabled={isRunning}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-60 disabled:cursor-progress"
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
  );
}

function CaptureResults({
  sections,
  totalDurationSec,
  totalSizeBytes,
  captureWallTimeSec,
  tourId,
}: {
  sections: CapturedSection[];
  totalDurationSec: number;
  totalSizeBytes: number;
  captureWallTimeSec: number;
  tourId: string;
}) {
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              <video
                controls
                src={s.mp4Url}
                className="w-full bg-black block"
              />
              <div className="p-2.5 border-t border-slate-100 flex items-center justify-end">
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
    </div>
  );
}

function Stat({ value }: { value: string }) {
  return <span className="text-slate-900">{value}</span>;
}
function Sep() {
  return <span className="text-slate-300">·</span>;
}
