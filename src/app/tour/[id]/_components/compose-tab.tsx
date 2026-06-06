"use client";

import "../../../editor.css";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Check, Download, ExternalLink, Film, Sparkles } from "lucide-react";
import Link from "next/link";
import PhaseLoader, { type RunningProgress } from "./phase-loader";
import Frame3DSelector from "./frame3d-selector";
import type { CapturedSection } from "./capture-tab";
import type { VoState } from "./voice-tab";
import type { AudioTrack } from "./music-library";
import type { TourEntry } from "@/lib/types/tour";
import { formatDuration } from "@/lib/format-duration";

/** Mirror of the Remotion style preset list. cls drives the gradient
 *  preview; studio gates Cinematic/Glitch (visual lock badge). */
const COMPOSE_STYLES = [
  { id: "sober", label: "Sober", cls: "pp-sober", studio: false, hint: "Mouvement minimal — corporate / documentary" },
  { id: "energetic", label: "Energetic", cls: "pp-energetic", studio: false, hint: "Look produit / SaaS punchy (défaut)" },
  { id: "cinematic", label: "Cinematic", cls: "pp-cinematic", studio: true, hint: "Storytelling lent, fades + wipes, halo subtil" },
  { id: "glitch", label: "Glitch", cls: "pp-glitch", studio: true, hint: "Esthétique tech / AI — glitch sur chaque transition" },
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
  captureSections: CapturedSection[] | null;
  voState: VoState;
  bgMusicId: string | undefined;
  tracks: AudioTrack[];
  bgMusicVolume: number;
  voVolume: number;
  onCompose: () => void;
}

/**
 * Compose tab — handoff layout (Phase 4). Preset cards + device frame
 * (Frame3DSelector, preserved) + final render player + readiness
 * checklist + export bar. All real state/handlers kept: compose state
 * machine, PhaseLoader, real <video>, onCompose, live preview link.
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
  const hasCapture = captureSections !== null && captureSections.length > 0;
  const isRunning = compose.kind === "running";
  const activeStyle = tour.composeStyle ?? "energetic";

  const selectedTrack =
    bgMusicId && bgMusicId !== "" ? tracks.find((t) => t.id === bgMusicId) ?? null : null;
  const bgMusicLabel =
    bgMusicId === "" ? "Aucune" : bgMusicId === undefined ? "Défaut catalogue" : selectedTrack?.originalName ?? "Track manquante";

  const ready: { ok: boolean; l: string; s: string }[] = [
    { ok: true, l: "Script", s: `${tour.steps.length} étapes` },
    { ok: hasCapture, l: "Captures", s: hasCapture ? `${captureSections!.length} sections` : "à capturer" },
    { ok: voState.kind === "ready", l: "Voix off", s: voState.kind === "ready" ? "générée" : "—" },
    { ok: true, l: "Audio", s: bgMusicLabel },
  ];

  return (
    <div className="gm-editor" data-wm-id="editor.compose">
      <div className="panel">
        <div className="panel-head">
          <div>
            <span className="kicker">Onglet 05</span>
            <h2 className="panel-title">Compose</h2>
            <p className="panel-sub">
              Remotion assemble le clip final. Choisissez un preset visuel et un device frame,
              puis lancez le rendu MP4.
            </p>
          </div>
        </div>

        <div className="two-col">
          <div className="min-w-0">
            {/* preset visuel */}
            <div className="kicker" style={{ marginBottom: 12 }}>Preset visuel</div>
            <div className="presets" data-wm-id="editor.compose.presets">
              {COMPOSE_STYLES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  title={p.hint}
                  className={"preset" + (activeStyle === p.id ? " sel" : "")}
                  onClick={() => onTourChange({ ...tour, composeStyle: p.id })}
                >
                  <div className={"preset-prev " + p.cls}><div className="chip-frame" /></div>
                  <div className="preset-foot">
                    <span className="pn">{p.label}</span>
                    {p.studio && <span className="lock">Studio</span>}
                  </div>
                </button>
              ))}
            </div>

            {/* device frame — Frame3DSelector préservé (il porte son propre
                en-tête "Device frame" + alimente les props Remotion) */}
            <div style={{ marginTop: 22 }}>
              <Frame3DSelector tour={tour} onTourChange={onTourChange} />
            </div>

            {/* rendu final */}
            <div className="kicker" style={{ margin: "22px 0 12px" }}>Rendu final</div>

            <AnimatePresence mode="wait">
              {compose.kind === "running" && (
                <motion.div key="run" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <PhaseLoader progress={compose.progress} variant="compose" />
                </motion.div>
              )}
            </AnimatePresence>

            {compose.kind === "error" && (
              <div className="rounded-[var(--r-lg)] border border-[oklch(60%_0.14_25_/_0.4)] bg-[oklch(95%_0.04_25_/_0.5)] p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-[oklch(52%_0.16_25)]" strokeWidth={2.5} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-ink">Compose échoué</p>
                  <p className="text-xs font-mono mt-1 text-muted break-words whitespace-pre-wrap">{compose.message}</p>
                </div>
              </div>
            )}

            {compose.kind === "ready" && (
              <>
                <div className="player" data-wm-id="editor.compose.player">
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video controls autoPlay src={compose.finalUrl} />
                </div>
                <div className="export-bar" data-wm-id="editor.compose.export">
                  <span className="export-meta">
                    <b>final.mp4</b> · {(compose.sizeBytes / 1024 / 1024).toFixed(1)} MB · compose {formatDuration(compose.captureWallTimeSec)}
                  </span>
                  <div className="compose-actions">
                    <a
                      href={compose.finalUrl}
                      download={`webgen-${tourId}-final.mp4`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-ink text-bg text-xs font-medium"
                    >
                      <Download className="w-3.5 h-3.5" /> Télécharger
                    </a>
                    <button
                      onClick={onCompose}
                      disabled={isRunning}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-line bg-surface text-ink text-xs font-medium hover:bg-surface-2 disabled:opacity-60"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Re-composer
                    </button>
                  </div>
                </div>
              </>
            )}

            {compose.kind === "idle" && (
              <div className="player">
                <div className="player-stage">
                  <div className="player-empty">
                    <Film className="w-7 h-7 opacity-70" />
                    {hasCapture ? (
                      <span>Prêt à composer — lance le rendu pour voir le final.mp4.</span>
                    ) : (
                      <span>Aucune capture. Va dans l&apos;onglet <b>Capture</b> d&apos;abord.</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* sidebar : readiness + actions */}
          <aside className="side-card" data-wm-id="editor.compose.readiness">
            <h4>Prêt à composer ?</h4>
            <div className="readiness">
              {ready.map((r) => (
                <div key={r.l} className={"rcheck " + (r.ok ? "ok" : "warn")}>
                  <span className="ri">{r.ok ? <Check /> : <AlertCircle />}</span>
                  <span className="rl">{r.l}</span>
                  <span className="rs">{r.s}</span>
                </div>
              ))}
            </div>
            <button
              onClick={onCompose}
              disabled={isRunning || !hasCapture}
              data-wm-id="editor.compose.run"
              className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-ink text-bg text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!hasCapture ? "Capture les sections d'abord" : "Lance le compositor headless"}
            >
              {isRunning ? (
                <><Sparkles className="w-4 h-4 animate-pulse" /> Compose · {formatDuration(compose.progress.sinceSec)}</>
              ) : (
                <><Film className="w-4 h-4" /> Composer maintenant</>
              )}
            </button>
            <Link
              href={buildPreviewHref(tourId, bgMusicId, bgMusicVolume, voVolume)}
              target="_blank"
              className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-line text-muted text-xs font-medium hover:bg-surface-2 hover:text-ink transition-colors"
              title="Aperçu live (mix audio synchro, sans re-compose)"
            >
              <ExternalLink className="w-3 h-3" /> Aperçu live
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}

function buildPreviewHref(
  tourId: string,
  bgMusicId: string | undefined,
  bgVol: number,
  voVol: number,
): string {
  const qs = new URLSearchParams();
  qs.set("audio", "1");
  if (bgMusicId && bgMusicId !== "") qs.set("bgMusicId", bgMusicId);
  qs.set("bgVol", bgVol.toFixed(2));
  qs.set("voVol", voVol.toFixed(2));
  return `/compose/${encodeURIComponent(tourId)}?${qs.toString()}`;
}
