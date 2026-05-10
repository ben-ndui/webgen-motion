"use client";

import { motion } from "framer-motion";
import { AlertCircle, Loader2 } from "lucide-react";

export interface RunningProgress {
  /** High-level phase label (e.g. "Section 2/3 · Pipeline · Splash"). */
  phase: string;
  sectionIdx?: number;
  totalSections?: number;
  stepIdx?: number;
  totalSteps?: number;
  stepType?: string;
  /** Frames captured so far (compose runner only). */
  frames?: number;
  sinceSec: number;
  lastWarn?: string;
}

interface Props {
  progress: RunningProgress;
  variant: "capture" | "compose" | "voice";
  accentClass?: string;
}

/**
 * Vertical animated status panel shown while a long-running runner
 * is in flight. Subscribes to NDJSON progress events from the API
 * routes (handled in the parent's `consumeNdjson`).
 */
export default function PhaseLoader({
  progress,
  variant,
  accentClass = "bg-zinc-900",
}: Props) {
  const sectionPct =
    progress.sectionIdx && progress.totalSections
      ? Math.min(
          100,
          Math.round((progress.sectionIdx / progress.totalSections) * 100),
        )
      : null;
  const stepPct =
    progress.stepIdx && progress.totalSteps
      ? Math.min(
          100,
          Math.round((progress.stepIdx / progress.totalSteps) * 100),
        )
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col gap-4"
    >
      <div className="flex items-center gap-3">
        <Loader2
          className="w-5 h-5 text-zinc-900 animate-spin"
          strokeWidth={2.5}
        />
        <div className="flex-1 min-w-0">
          <p
            key={progress.phase}
            className="font-semibold text-sm text-slate-900 truncate"
          >
            {progress.phase}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {progress.sinceSec}s écoulées
            {variant === "compose" && progress.frames !== undefined
              ? ` · ${progress.frames} frames capturées`
              : ""}
          </p>
        </div>
      </div>

      {sectionPct !== null && (
        <ProgressBar
          label="Sections"
          counter={`${progress.sectionIdx}/${progress.totalSections}`}
          pct={sectionPct}
          accentClass={accentClass}
        />
      )}

      {stepPct !== null && progress.stepType && (
        <ProgressBar
          label={`Étape · ${progress.stepType}`}
          counter={`${progress.stepIdx}/${progress.totalSteps}`}
          pct={stepPct}
          accentClass={`${accentClass} opacity-60`}
          thin
        />
      )}

      {progress.lastWarn && (
        <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-600" />
          <p className="text-xs font-mono text-amber-800 break-all">
            {progress.lastWarn}
          </p>
        </div>
      )}
    </motion.div>
  );
}

function ProgressBar({
  label,
  counter,
  pct,
  accentClass,
  thin,
}: {
  label: string;
  counter: string;
  pct: number;
  accentClass: string;
  thin?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 text-slate-500">
        <p className="text-[10px] uppercase tracking-[0.2em] font-mono">
          {label}
        </p>
        <p className="text-xs font-mono">{counter}</p>
      </div>
      <div
        className={`${thin ? "h-1" : "h-1.5"} rounded-full overflow-hidden bg-slate-100`}
      >
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
          className={`h-full rounded-full ${accentClass}`}
        />
      </div>
    </div>
  );
}
