"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Mic,
  Play,
  Sparkles,
} from "lucide-react";
import type { TourEntry } from "@/lib/types/tour";
import PhaseLoader, { type RunningProgress } from "./phase-loader";

export type VoState =
  | { kind: "idle" }
  | { kind: "running"; progress: RunningProgress }
  | {
      kind: "ready";
      voiceoverUrl: string;
      captureWallTimeSec: number;
    }
  | { kind: "error"; message: string };

interface Props {
  tour: TourEntry;
  voState: VoState;
  voOverrides: Record<string, string>;
  onGenerateVo: () => void;
  onJumpToScript: () => void;
}

/**
 * Voice tab. Triggers ElevenLabs TTS generation for every step that
 * has a voiceover (catalogue + UI overrides merged). Shows live phase
 * feedback while the runner streams NDJSON, plus an `<audio>` preview
 * of the produced voiceover.mp3.
 */
export default function VoiceTab({
  tour,
  voState,
  voOverrides,
  onGenerateVo,
  onJumpToScript,
}: Props) {
  const counters = countVoiceovers(tour, voOverrides);
  const hasAnyActive = counters.active > 0;
  const isRunning = voState.kind === "running";

  return (
    <div className="space-y-6">
      {/* Action card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-1">
            ElevenLabs TTS
          </p>
          <h2 className="text-lg font-semibold text-slate-900">
            Générer la voix off
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Synthèse via ta voix clonée (env{" "}
            <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">
              ELEVENLABS_VOICE_ID
            </code>
            ) avec cache disk + pronunciation map. Assemble une track timeline
            alignée sur les sections.
          </p>
        </div>
        <button
          onClick={onGenerateVo}
          disabled={isRunning || !hasAnyActive}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          title={
            !hasAnyActive
              ? "Aucune voix off active — écris un texte dans le tab Script pour au moins une étape"
              : "Génère la VO via ElevenLabs (cache auto sur textes inchangés)"
          }
        >
          {isRunning ? (
            <>
              <Sparkles className="w-4 h-4 animate-pulse" />
              Génération · {voState.progress.sinceSec}s
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              Générer la voix off
            </>
          )}
        </button>
      </div>

      {/* VO counts strip */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-6 flex-wrap">
          <Counter label="Voix actives" value={counters.active} mono />
          <Counter
            label="Steps éligibles"
            value={counters.eligible}
            mono
          />
          <Counter
            label="Overrides UI"
            value={counters.overrides}
            mono
            warn={counters.overrides > 0}
          />
        </div>
        <button
          onClick={onJumpToScript}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200 transition-colors"
        >
          Éditer dans Script
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Phase loader */}
      <AnimatePresence>
        {voState.kind === "running" && (
          <PhaseLoader progress={voState.progress} variant="voice" />
        )}
      </AnimatePresence>

      {/* Ready */}
      {voState.kind === "ready" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3 flex-wrap"
        >
          <span className="w-9 h-9 rounded-xl bg-emerald-600 text-white grid place-items-center flex-shrink-0">
            <Play className="w-4 h-4" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-900">
              voiceover.mp3 prêt
            </p>
            <p className="text-xs text-emerald-700 mt-0.5">
              Généré en {voState.captureWallTimeSec}s · auto-mixé au prochain
              compose
            </p>
          </div>
          <audio
            src={voState.voiceoverUrl}
            controls
            preload="none"
            className="h-8 max-w-[280px]"
          />
        </motion.div>
      )}

      {/* Error */}
      {voState.kind === "error" && (
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
              Génération échouée
            </p>
            <p className="text-xs font-mono mt-1 text-rose-700 break-words whitespace-pre-wrap">
              {voState.message}
            </p>
          </div>
        </motion.div>
      )}

      {/* Idle empty */}
      {voState.kind === "idle" && !hasAnyActive && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-8 py-12 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-900 text-white mb-4">
            <Mic className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">
            Aucune voix active
          </h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Va dans le tab <strong>Script</strong> et écris une voix off sur au
            moins une étape (sections, overlays, scrolls, waits, hovers).
          </p>
        </div>
      )}
    </div>
  );
}

function Counter({
  label,
  value,
  mono,
  warn,
}: {
  label: string;
  value: number;
  mono?: boolean;
  warn?: boolean;
}) {
  return (
    <div>
      <p
        className={`text-[10px] uppercase tracking-[0.2em] ${mono ? "font-mono" : ""} ${warn ? "text-amber-700" : "text-slate-500"} mb-1`}
      >
        {label}
      </p>
      <p
        className={`text-xl font-semibold ${warn ? "text-amber-900" : "text-slate-900"}`}
      >
        {value}
      </p>
    </div>
  );
}

function countVoiceovers(
  tour: TourEntry,
  overrides: Record<string, string>,
): { active: number; eligible: number; overrides: number } {
  let eligible = 0;
  let active = 0;
  for (let i = 0; i < tour.steps.length; i++) {
    const s = tour.steps[i];
    const canHave =
      s.type === "section" ||
      s.type === "overlay" ||
      s.type === "scroll" ||
      s.type === "wait" ||
      s.type === "hover";
    if (!canHave) continue;
    eligible++;
    const baseVo = "voiceover" in s ? s.voiceover : undefined;
    const override = overrides[String(i)];
    const effective = override !== undefined ? override : (baseVo ?? "");
    if (effective.trim().length > 0) active++;
  }
  return {
    active,
    eligible,
    overrides: Object.keys(overrides).length,
  };
}
