"use client";

import "../../../editor.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Info,
  Mic,
  Play,
  Plus,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useRef, useState } from "react";
import { formatDuration } from "@/lib/format-duration";
import type { TourEntry, TourStep } from "@/lib/types/tour";
import PhaseLoader, { type RunningProgress } from "./phase-loader";
import type { SaveStatus } from "./script-tab";
import VoiceOverrideCard from "./voice-override-card";

export type VoState =
  | { kind: "idle" }
  | { kind: "running"; progress: RunningProgress }
  | {
      kind: "ready";
      voiceoverUrl: string;
      captureWallTimeSec: number;
    }
  | { kind: "error"; message: string };

type CalibrateState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "done"; updatedSteps: number; totalNarrativeSec: number };

interface Props {
  tour: TourEntry;
  voState: VoState;
  onGenerateVo: () => void;
  onJumpToScript: () => void;
  onTourChange: (tour: TourEntry) => void;
  onSaveTour: () => Promise<void> | void;
  saveStatus: SaveStatus;
}

/**
 * Voice tab. Two voice modes :
 *
 *  - **Per-step** (default) : ScriptTab edits per-step `voiceover`
 *    fields, the runner concatenates them with silence padding to
 *    match the section MP4 durations. This tab shows VO counters and
 *    a Generate button.
 *
 *  - **Narrative** : the user writes ONE continuous narration with
 *    `[step:N]` markers. ElevenLabs returns char-level timings; the
 *    runner derives each step's `audioStartSec` from marker positions.
 *    A "Calibrer" button reads the alignment + writes new `dwellMs`
 *    on every referenced step so the next capture matches the VO
 *    pacing exactly.
 */
export default function VoiceTab({
  tour,
  voState,
  onGenerateVo,
  onJumpToScript,
  onTourChange,
  onSaveTour,
  saveStatus,
}: Props) {
  const counters = countVoiceovers(tour);
  const isNarrative = tour.voiceMode === "narrative";
  const isRunning = voState.kind === "running";

  // Narrative-mode local state. Calibrate is independent from VO
  // generation since it just reads the alignment artifact.
  const [calibrate, setCalibrate] = useState<CalibrateState>({ kind: "idle" });
  const narrativeRef = useRef<HTMLTextAreaElement | null>(null);

  const setVoiceMode = (mode: "per-step" | "narrative") => {
    onTourChange({
      ...tour,
      voiceMode: mode,
      // Seed an empty narrative on first switch so the textarea has
      // something to anchor — the user can replace it.
      narrativeScript:
        mode === "narrative" && !tour.narrativeScript
          ? "[step:0]…"
          : tour.narrativeScript,
    });
  };

  const setNarrative = (text: string) => {
    onTourChange({ ...tour, narrativeScript: text });
  };

  const insertMarkerAt = (stepIdx: number) => {
    const ta = narrativeRef.current;
    const cur = tour.narrativeScript ?? "";
    if (!ta) {
      setNarrative(cur + ` [step:${stepIdx}]`);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const next = `${cur.slice(0, start)}[step:${stepIdx}]${cur.slice(end)}`;
    setNarrative(next);
    // Restore caret right after the inserted marker on next tick.
    setTimeout(() => {
      ta.focus();
      const pos = start + `[step:${stepIdx}]`.length;
      ta.setSelectionRange(pos, pos);
    }, 0);
  };

  const handleCalibrate = async () => {
    setCalibrate({ kind: "loading" });
    try {
      const res = await fetch(
        `/api/motion/tour/audio/voice/alignment?id=${encodeURIComponent(tour.id)}`,
      );
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: `HTTP ${res.status}` }));
        setCalibrate({
          kind: "error",
          message: err.error ?? "Échec lecture alignment",
        });
        return;
      }
      const data = (await res.json()) as {
        voiceMode?: string;
        totalDurationSec?: number;
        items?: Array<{
          linearStepIdx: number;
          audioStartSec: number;
          audioDurationSec: number;
          kind: string;
        }>;
      };
      if (data.voiceMode !== "narrative") {
        setCalibrate({
          kind: "error",
          message:
            "Alignment found mais pas en mode narrative — lance d'abord la génération VO en mode narrative.",
        });
        return;
      }
      const items = (data.items ?? []).filter(
        (i) => i.kind === "narrative-step",
      );
      if (items.length === 0) {
        setCalibrate({
          kind: "error",
          message:
            "Aucun marker [step:N] détecté dans la dernière génération — ajoute des markers et relance la VO.",
        });
        return;
      }

      // Build new dwellMs values. For each step referenced by a
      // marker, set dwellMs = audioDurationSec * 1000 (rounded). Steps
      // without a marker keep their existing dwellMs.
      const dwellByStep = new Map<number, number>();
      for (const it of items) {
        const ms = Math.max(200, Math.round(it.audioDurationSec * 1000));
        dwellByStep.set(it.linearStepIdx, ms);
      }
      const nextSteps: TourStep[] = tour.steps.map((step, i) => {
        const ms = dwellByStep.get(i);
        if (ms === undefined) return step;
        if (step.type === "wait") return { ...step, dwellMs: ms };
        return { ...step, dwellMs: ms } as TourStep;
      });
      const updated = { ...tour, steps: nextSteps };
      onTourChange(updated);
      // Persist immediately — the user expects the calibration to
      // stick, no need to make them hit "Save".
      await onSaveTour();
      setCalibrate({
        kind: "done",
        updatedSteps: dwellByStep.size,
        totalNarrativeSec: data.totalDurationSec ?? 0,
      });
    } catch (e) {
      setCalibrate({
        kind: "error",
        message: e instanceof Error ? e.message : "Network error",
      });
    }
  };

  const generateDisabled =
    isRunning ||
    (isNarrative ? !tour.narrativeScript?.trim() : counters.active === 0);
  const generateTitle = isNarrative
    ? !tour.narrativeScript?.trim()
      ? "Écris un script narratif d'abord"
      : "Génère la VO narrative continue"
    : counters.active === 0
      ? "Aucune voix off active — écris un texte dans le tab Script"
      : "Génère la VO via ElevenLabs";
  const generateDescription = isNarrative
    ? "Synthèse via ta voix clonée. Mode narrative : 1 fetch /with-timestamps pour le script entier, alignment char-level retourné."
    : "Synthèse via ta voix clonée. Mode per-step : 1 fetch par ligne, assemblage timeline avec padding silencieux entre chaque chunk.";

  const actionCard = (
    <div className="rounded-2xl border border-line bg-surface p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted mb-1">
            ElevenLabs TTS
          </p>
          <h2 className="text-sm font-semibold text-ink leading-tight">
            Générer la voix off
          </h2>
        </div>
        <button
          type="button"
          title={generateDescription}
          aria-label="À propos de la génération VO"
          className="flex-shrink-0 text-faint hover:text-ink-soft transition-colors cursor-help"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>
      <button
        onClick={onGenerateVo}
        disabled={generateDisabled}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-ink text-bg text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        title={generateTitle}
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
  );

  const calibrateCard =
    isNarrative && voState.kind === "ready" ? (
      <div className="rounded-2xl border border-line bg-surface p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted mb-1">
              Synchro
            </p>
            <h2 className="text-sm font-semibold text-ink leading-tight">
              Calibrer la timeline
            </h2>
          </div>
          <button
            type="button"
            title="Lit voiceover-alignment.json et écrit les nouveaux dwellMs sur chaque step référencé par un marker. Ensuite, lance Capturer pour produire des sections au pacing exact de la voix."
            aria-label="À propos de la calibration"
            className="flex-shrink-0 text-faint hover:text-ink-soft transition-colors cursor-help"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={handleCalibrate}
          disabled={calibrate.kind === "loading"}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-ink text-bg text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {calibrate.kind === "loading" ? (
            <>
              <Sparkles className="w-4 h-4 animate-pulse" />
              Calibration…
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              Calibrer la timeline
            </>
          )}
        </button>
      </div>
    ) : null;

  return (
    <div className="gm-editor" data-wm-id="editor.voice">
      <div className="panel">
        <div className="panel-head">
          <div>
            <span className="kicker">Onglet 04</span>
            <h2 className="panel-title">Voix off</h2>
            <p className="panel-sub">
              Mode narratif continu ou voix off par étape. ElevenLabs clone votre voix,
              ou Voicebox tourne 100% en local.
            </p>
          </div>
        </div>
        <div className="two-col">
      <div className="space-y-6 min-w-0">
      {/* Action + Calibrate inline at md- (sidebar takes them at lg+) */}
      <div className="lg:hidden space-y-4">
        {actionCard}
        {calibrateCard}
      </div>

      {/* Mode toggle */}
      <div className="rounded-2xl border border-line bg-surface p-4 flex items-center gap-3 flex-wrap">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted mr-2">
          Mode
        </p>
        <ModePill
          active={!isNarrative}
          onClick={() => setVoiceMode("per-step")}
          label="Per-step"
          help="Une voix off par étape (depuis le tab Script)"
        />
        <ModePill
          active={isNarrative}
          onClick={() => setVoiceMode("narrative")}
          label="Narrative"
          help="Un texte continu, markers [step:N] pour synchro"
        />
        <span className="ml-auto text-xs text-muted font-mono">
          {isNarrative
            ? "ElevenLabs → 1 clip · timings calibrés depuis l'alignment"
            : "ElevenLabs → 1 clip / step · padding silencieux entre chaque"}
        </span>
      </div>

      {/* Narrative editor (only in narrative mode) */}
      {isNarrative && (
        <div className="rounded-2xl border border-line bg-surface p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted mb-1">
                Script narratif
              </p>
              <h2 className="text-base font-semibold text-ink">
                Texte continu de la voix off
              </h2>
            </div>
            <SaveBadge status={saveStatus} />
          </div>
          <textarea
            ref={narrativeRef}
            value={tour.narrativeScript ?? ""}
            onChange={(e) => setNarrative(e.target.value)}
            rows={8}
            className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            placeholder="[step:0]Bienvenue sur GEN MOTION. [step:2]Génère des vidéos motion design [step:5]depuis n'importe quel site."
            spellCheck={false}
          />
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted mr-1">
              Insérer marker
            </p>
            {tour.steps.map((s, i) => (
              <button
                key={i}
                onClick={() => insertMarkerAt(i)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-surface-2 hover:bg-bg-sunken text-ink-soft text-[11px] font-mono transition-colors"
                title={`Insère [step:${i}] (${stepLabel(s)})`}
              >
                <Plus className="w-3 h-3" />
                {i}·{s.type}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">
            Les markers <code className="font-mono">[step:N]</code> indiquent à
            quel moment chaque overlay doit apparaître. Après génération, tu
            peux <strong>Calibrer</strong> pour aligner les{" "}
            <code className="font-mono">dwellMs</code> sur les vrais timings
            ElevenLabs (puis re-Capturer).
          </p>
        </div>
      )}

      {/* Counters strip — narrative shows marker count, per-step shows VO actives */}
      <div className="rounded-2xl border border-line bg-surface p-4 flex items-center justify-between gap-3 flex-wrap">
        {isNarrative ? (
          <div className="flex items-center gap-6 flex-wrap">
            <Counter
              label="Markers"
              value={countMarkers(tour.narrativeScript ?? "")}
              mono
            />
            <Counter label="Steps total" value={tour.steps.length} mono />
            <Counter
              label="Caractères"
              value={tour.narrativeScript?.length ?? 0}
              mono
            />
          </div>
        ) : (
          <div className="flex items-center gap-6 flex-wrap">
            <Counter label="Voix actives" value={counters.active} mono />
            <Counter label="Steps éligibles" value={counters.eligible} mono />
          </div>
        )}
        <button
          onClick={onJumpToScript}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-2 text-ink-soft text-xs font-medium hover:bg-bg-sunken transition-colors"
        >
          {isNarrative ? "Voir les steps" : "Éditer dans Script"}
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
          <span className="w-9 h-9 rounded-xl bg-emerald-600 text-bg grid place-items-center flex-shrink-0">
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

      {calibrate.kind === "done" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3"
        >
          <CheckCircle2
            className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600"
            strokeWidth={2.5}
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-emerald-900">
              Timeline calibrée
            </p>
            <p className="text-xs text-emerald-700 mt-0.5">
              {calibrate.updatedSteps} step(s) recalés ·{" "}
              {formatDuration(calibrate.totalNarrativeSec, { precise: true })} de narration. Lance la{" "}
              <strong>Capture</strong> pour resynchroniser les sections.
            </p>
          </div>
        </motion.div>
      )}

      {calibrate.kind === "error" && (
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
              Calibration impossible
            </p>
            <p className="text-xs font-mono mt-1 text-rose-700 break-words whitespace-pre-wrap">
              {calibrate.message}
            </p>
          </div>
        </motion.div>
      )}

      {/* Idle empty (per-step mode without any active VO) */}
      {!isNarrative && voState.kind === "idle" && counters.active === 0 && (
        <div className="rounded-2xl border border-dashed border-line-strong bg-surface px-8 py-12 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-ink text-bg mb-4">
            <Mic className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-ink mb-1">
            Aucune voix active
          </h3>
          <p className="text-sm text-muted max-w-md mx-auto leading-relaxed">
            Va dans le tab <strong>Script</strong> et écris une voix off sur au
            moins une étape (sections, overlays, scrolls, waits, hovers).
          </p>
        </div>
      )}
      </div>

      {/* Sticky aside (lg+) — action above, calibrate (if shown), then voice override */}
      <aside className="hidden lg:block lg:sticky lg:top-6 self-start space-y-4">
        {actionCard}
        {calibrateCard}
        <VoiceOverrideCard tour={tour} onChange={onTourChange} />
      </aside>
        </div>
      </div>
    </div>
  );
}

function ModePill({
  active,
  onClick,
  label,
  help,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  help: string;
}) {
  return (
    <button
      onClick={onClick}
      title={help}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
        active
          ? "bg-ink text-bg"
          : "bg-surface-2 text-ink-soft hover:bg-bg-sunken"
      }`}
    >
      {label}
    </button>
  );
}

function SaveBadge({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  if (status === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-surface-2 text-ink-soft text-[11px] font-mono">
        <Sparkles className="w-3 h-3 animate-pulse" />
        Sauvegarde…
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-mono">
        <CheckCircle2 className="w-3 h-3" />
        Sauvegardé
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-rose-50 text-rose-700 text-[11px] font-mono">
      <AlertCircle className="w-3 h-3" />
      Erreur
    </span>
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
        className={`text-[10px] uppercase tracking-[0.2em] ${mono ? "font-mono" : ""} ${warn ? "text-amber-700" : "text-muted"} mb-1`}
      >
        {label}
      </p>
      <p
        className={`text-xl font-semibold ${warn ? "text-amber-900" : "text-ink"}`}
      >
        {value}
      </p>
    </div>
  );
}

function countVoiceovers(tour: TourEntry): {
  active: number;
  eligible: number;
} {
  let eligible = 0;
  let active = 0;
  for (const s of tour.steps) {
    const canHave =
      s.type === "section" ||
      s.type === "overlay" ||
      s.type === "scroll" ||
      s.type === "wait" ||
      s.type === "hover";
    if (!canHave) continue;
    eligible++;
    const text = "voiceover" in s ? (s.voiceover ?? "") : "";
    if (text.trim().length > 0) active++;
  }
  return { active, eligible };
}

function countMarkers(script: string): number {
  const m = script.match(/\[step:\d+\]/g);
  return m?.length ?? 0;
}

function stepLabel(step: TourStep): string {
  switch (step.type) {
    case "section":
      return step.title;
    case "overlay":
      return step.text.slice(0, 30);
    case "click":
      return step.selector;
    case "scroll":
      return `to ${step.to}`;
    case "wait":
      return `${step.dwellMs}ms`;
    case "goto":
      return step.url;
    default:
      return step.type;
  }
}
