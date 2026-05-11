"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Download, ExternalLink, Film, Info, Sparkles } from "lucide-react";
import Link from "next/link";
import PhaseLoader, { type RunningProgress } from "./phase-loader";
import type { CapturedSection } from "./capture-tab";
import type { VoState } from "./voice-tab";
import type { AudioTrack } from "./music-library";
import type { TourEntry } from "@/lib/types/tour";

/** Mirror of the Remotion style preset list (remotion/lib/style-presets.ts).
 *  Kept inline rather than imported because the Remotion module pulls
 *  in a TransitionId type that's only useful at render time. */
const COMPOSE_STYLES = [
  {
    id: "sober",
    label: "Sober",
    hint: "Mouvement minimal — corporate / documentary",
  },
  {
    id: "energetic",
    label: "Energetic",
    hint: "Look produit / SaaS punchy (défaut)",
  },
  {
    id: "cinematic",
    label: "Cinematic",
    hint: "Storytelling lent, fades + wipes, halo subtil",
  },
  {
    id: "glitch",
    label: "Glitch",
    hint: "Esthétique tech / AI — glitch sur chaque transition",
  },
] as const;

export type ComposeState =
  | { kind: "idle" }
  | { kind: "running"; progress: RunningProgress }
  | {
      kind: "ready";
      finalUrl: string;
      sizeBytes: number;
      captureWallTimeSec: number;
    }
  | { kind: "error"; message: string };

interface Props {
  tourId: string;
  tour: TourEntry;
  onTourChange: (next: TourEntry) => void;
  compose: ComposeState;
  /** Capture state — used to gate the action ("need capture first"). */
  captureSections: CapturedSection[] | null;
  /** Voice state — informational, shown in the readiness strip. */
  voState: VoState;
  /** bgMusicId is "" / undefined / "<id>". Tracks list lets us look up the name. */
  bgMusicId: string | undefined;
  tracks: AudioTrack[];
  bgMusicVolume: number;
  voVolume: number;
  onCompose: () => void;
}

/**
 * Compose tab — final.mp4 production. Shows:
 * - Readiness strip : sections / VO / bgMusic / volumes (live mix recap)
 * - Action card : Compose CTA (disabled if no capture yet)
 * - Phase loader during run
 * - Final video player + metadata + download
 * - Aperçu manuel link to /compose/<id> for interactive scrub
 */
export default function ComposeTab({
  tourId,
  tour,
  onTourChange,
  compose,
  captureSections,
  voState,
  bgMusicId,
  tracks,
  bgMusicVolume,
  voVolume,
  onCompose,
}: Props) {
  const hasCapture =
    captureSections !== null && captureSections.length > 0;
  const isRunning = compose.kind === "running";
  const selectedTrack =
    bgMusicId && bgMusicId !== ""
      ? tracks.find((t) => t.id === bgMusicId) ?? null
      : null;
  const bgMusicLabel =
    bgMusicId === ""
      ? "Aucune"
      : bgMusicId === undefined
        ? "Défaut catalogue"
        : (selectedTrack?.originalName ?? "Track manquante");

  const readinessStats = {
    sections: hasCapture ? String(captureSections.length) : "—",
    sectionsDim: !hasCapture,
    voOk: voState.kind === "ready",
    bgMusicLabel,
    mix: `bg ${bgMusicVolume.toFixed(2)} · vo ${voVolume.toFixed(2)}`,
  };

  const actionDescription = `Headless re-films le compositor (Mac chrome / iPhone frame + backdrop coloré + transitions) avec la musique + la voix off mixées.\nSortie : ~/.webgen-motion/tours/${tourId}/final.mp4`;

  const activeStyle = tour.composeStyle ?? "energetic";
  const activeStylePreset =
    COMPOSE_STYLES.find((s) => s.id === activeStyle) ?? COMPOSE_STYLES[1];

  const actionCard = (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-1">
            Action
          </p>
          <h2 className="text-sm font-semibold text-slate-900 leading-tight">
            Composer le clip final
          </h2>
        </div>
        <button
          type="button"
          title={actionDescription}
          aria-label="À propos du compose"
          className="flex-shrink-0 text-slate-400 hover:text-slate-700 transition-colors cursor-help"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>

      {/* Style preset selector — feeds into Tour composition props. */}
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-wider font-mono text-slate-500 block">
          Style du montage
        </label>
        <select
          value={activeStyle}
          onChange={(e) =>
            onTourChange({ ...tour, composeStyle: e.target.value })
          }
          className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
          title={activeStylePreset.hint}
        >
          {COMPOSE_STYLES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <p className="hidden sm:block text-[10px] text-slate-500 leading-relaxed">
          {activeStylePreset.hint}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={onCompose}
          disabled={isRunning || !hasCapture}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          title={
            !hasCapture
              ? "Capture d'abord les sections dans le tab Capture"
              : "Lance le compositor headless (re-film + mix audio)"
          }
        >
          {isRunning ? (
            <>
              <Sparkles className="w-4 h-4 animate-pulse" />
              Compose · {compose.progress.sinceSec}s
            </>
          ) : (
            <>
              <Film className="w-4 h-4" />
              Composer le clip final
            </>
          )}
        </button>
        <Link
          href={buildPreviewHref(tourId, bgMusicId, bgMusicVolume, voVolume)}
          target="_blank"
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200 transition-colors"
          title="Aperçu live (audio playback synchro, sans re-compose)"
        >
          <ExternalLink className="w-3 h-3" />
          Aperçu live
        </Link>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] 2xl:grid-cols-[1fr_360px] gap-6">
      <div className="space-y-5 min-w-0">
        {/* Action + Readiness inline at md- (sidebar takes them at lg+) */}
        <div className="lg:hidden space-y-4">
          {actionCard}
          <ReadinessCard stats={readinessStats} orientation="horizontal" />
        </div>

      {/* Phase loader */}
      <AnimatePresence>
        {compose.kind === "running" && (
          <PhaseLoader progress={compose.progress} variant="compose" />
        )}
      </AnimatePresence>

      {/* Error */}
      {compose.kind === "error" && (
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
              Compose échoué
            </p>
            <p className="text-xs font-mono mt-1 text-rose-700 break-words whitespace-pre-wrap">
              {compose.message}
            </p>
          </div>
        </motion.div>
      )}

      {/* Final preview */}
      {compose.kind === "ready" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-zinc-900 bg-white overflow-hidden"
        >
          <div className="p-4 flex items-center justify-between gap-3 flex-wrap border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-zinc-900 text-white grid place-items-center">
                <Film className="w-3.5 h-3.5" />
              </span>
              <h3 className="text-sm font-semibold text-slate-900">
                final.mp4
              </h3>
              <span className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                prêt
              </span>
            </div>
            <p className="text-xs font-mono text-slate-500">
              {(compose.sizeBytes / 1024 / 1024).toFixed(1)} MB · compose
              wall {compose.captureWallTimeSec}s
            </p>
          </div>
          <video
            controls
            autoPlay
            src={compose.finalUrl}
            className="w-full bg-black block"
          />
          <div className="p-3 border-t border-slate-200 flex items-center gap-2">
            <a
              href={compose.finalUrl}
              download={`webgen-${tourId}-final.mp4`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 transition-colors"
            >
              <Download className="w-3 h-3" />
              Télécharger
            </a>
            <button
              onClick={onCompose}
              disabled={isRunning}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200 transition-colors disabled:opacity-60"
            >
              <Sparkles className="w-3 h-3" />
              Re-composer
            </button>
          </div>
        </motion.div>
      )}

      {/* Idle empty (no capture yet) */}
      {compose.kind === "idle" && !hasCapture && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-8 py-12 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-900 text-white mb-4">
            <Film className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">
            Aucune capture à composer
          </h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Va dans le tab <strong>Capture</strong> pour filmer les sections
            d&apos;abord — le compose mixe les section MP4s + la voix off
            (optionnelle) + la musique.
          </p>
        </div>
      )}
      </div>

      {/* Sidebar (lg+) — action above, readiness below */}
      <aside className="hidden lg:block lg:sticky lg:top-6 self-start space-y-4">
        {actionCard}
        <ReadinessCard stats={readinessStats} orientation="vertical" />
      </aside>
    </div>
  );
}

interface ReadinessStats {
  sections: string;
  sectionsDim: boolean;
  voOk: boolean;
  bgMusicLabel: string;
  mix: string;
}

function ReadinessCard({
  stats,
  orientation,
}: {
  stats: ReadinessStats;
  orientation: "horizontal" | "vertical";
}) {
  const vertical = orientation === "vertical";
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-4 gap-4 ${
        vertical
          ? "flex flex-col"
          : "grid grid-cols-2 sm:grid-cols-4"
      }`}
    >
      {vertical && (
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">
          État
        </p>
      )}
      <Stat
        label="Sections"
        value={stats.sections}
        mono
        dim={stats.sectionsDim}
      />
      <Stat
        label="Voix off"
        value={stats.voOk ? "OK" : "—"}
        mono
        dim={!stats.voOk}
      />
      <Stat label="Musique" value={stats.bgMusicLabel} truncate />
      <Stat label="Mix" value={stats.mix} mono />
    </div>
  );
}

function buildPreviewHref(
  tourId: string,
  bgMusicId: string | undefined,
  bgVol: number,
  voVol: number,
): string {
  // Compose page reads these params and wires hidden <audio> elements
  // synced with section playback — gives a live preview of the mix
  // without invoking the headless compose runner.
  const qs = new URLSearchParams();
  qs.set("audio", "1");
  if (bgMusicId && bgMusicId !== "") qs.set("bgMusicId", bgMusicId);
  qs.set("bgVol", bgVol.toFixed(2));
  qs.set("voVol", voVol.toFixed(2));
  return `/compose/${encodeURIComponent(tourId)}?${qs.toString()}`;
}

function Stat({
  label,
  value,
  mono,
  dim,
  truncate,
}: {
  label: string;
  value: string;
  mono?: boolean;
  dim?: boolean;
  truncate?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-1">
        {label}
      </p>
      <p
        className={`text-sm ${mono ? "font-mono" : "font-medium"} ${dim ? "text-slate-400" : "text-slate-900"} ${truncate ? "truncate" : ""}`}
        title={truncate ? value : undefined}
      >
        {value}
      </p>
    </div>
  );
}
