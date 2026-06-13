"use client";

import "../../../editor.css";
import { AlertCircle, Check, Monitor, Smartphone, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { type RunningProgress } from "./phase-loader";
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
  platform?: "web" | "ios" | "android";
  onCapture: () => void;
  onSectionRecaptured: () => void;
}

/**
 * Capture tab — handoff layout (Phase 4). Sections grid (left) + the dark
 * streaming phase-panel (right, the tab's signature) driven by the real
 * NDJSON progress. All real flow preserved: onCapture, per-section
 * recapture / trim / replace / reorder / lightbox (SectionCard).
 */
export default function CaptureTab({
  capture,
  captureFormat,
  tourId,
  platform,
  onCapture,
  onSectionRecaptured,
}: Props) {
  const isRunning = capture.kind === "running";
  const Fmt = captureFormat === "9:16" ? Smartphone : Monitor;
  const isMobile = platform === "ios" || platform === "android";

  return (
    <div className="gm-editor" data-wm-id="editor.capture">
      <div className="panel">
        {isMobile && <MobileReadiness platform={platform as "ios" | "android"} />}
        <div className="panel-head">
          <div>
            <span className="kicker">Onglet 02</span>
            <h2 className="panel-title">Capture</h2>
            <p className="panel-sub">
              Puppeteer filme chaque section sur votre machine (format {captureFormat}).
              Relancez une capture quand le script change.
            </p>
          </div>
          <button
            onClick={onCapture}
            disabled={isRunning}
            data-wm-id="editor.capture.run"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-accent text-accent-ink text-sm font-medium shadow-sm hover:bg-accent-hover disabled:opacity-60 disabled:cursor-default"
          >
            <Fmt className="w-4 h-4" />
            {isRunning ? "Capture en cours…" : "Capturer les sections"}
          </button>
        </div>

        <div className="two-col">
          <div className="min-w-0">
            {capture.kind === "error" && (
              <div className="rounded-[var(--r-lg)] border border-[oklch(60%_0.14_25_/_0.4)] bg-[oklch(95%_0.04_25_/_0.5)] p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-[oklch(52%_0.16_25)]" strokeWidth={2.5} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-ink">Capture échouée</p>
                  <p className="text-xs font-mono mt-1 text-muted break-words whitespace-pre-wrap">{capture.message}</p>
                </div>
              </div>
            )}

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

            {(capture.kind === "idle" || capture.kind === "running") && (
              <div className="cap-empty">
                <span className="ci"><Video className="w-5 h-5" /></span>
                <h3>{isRunning ? "Capture en cours…" : "Prêt à filmer"}</h3>
                <p>
                  {isRunning
                    ? "Le panneau de droite suit l'avancement section par section."
                    : "Vérifie le format dans l'onglet Script puis lance la capture — une fenêtre Chromium joue le script et écrit les sections sur ton disque."}
                </p>
              </div>
            )}
          </div>

          {/* dark streaming phase-panel — the Capture signature */}
          <aside className="phase-panel" data-wm-id="editor.capture.stream">
            {capture.kind === "running" ? (
              <RunningPanel progress={capture.progress} />
            ) : capture.kind === "ready" ? (
              <DonePanel sections={capture.sections.length} wall={capture.captureWallTimeSec} />
            ) : (
              <IdlePanel />
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function RunningPanel({ progress }: { progress: RunningProgress }) {
  const secPct =
    progress.sectionIdx && progress.totalSections
      ? Math.min(100, Math.round((progress.sectionIdx / progress.totalSections) * 100))
      : 0;
  const stepPct =
    progress.stepIdx && progress.totalSteps
      ? Math.min(100, Math.round((progress.stepIdx / progress.totalSteps) * 100))
      : null;
  return (
    <>
      <div className="phase-head">
        <span className="pt"><span className="live-dot" />Capture en cours</span>
        <span className="mono" style={{ fontSize: 11, opacity: 0.7 }}>{progress.sinceSec}s</span>
      </div>
      <div className="phase-list">
        <div className="phase active">
          <span className="pi"><span className="spinner" /></span>
          <span>{progress.phase}</span>
          <span style={{ fontSize: 10, opacity: 0.7 }}>
            {progress.sectionIdx && progress.totalSections ? `${progress.sectionIdx}/${progress.totalSections}` : ""}
          </span>
        </div>
        {stepPct !== null && progress.stepType && (
          <div className="phase done">
            <span className="pi"><span style={{ width: 6, height: 6, borderRadius: 9, background: "currentColor", opacity: 0.5 }} /></span>
            <span>Étape · {progress.stepType}</span>
            <span style={{ fontSize: 10, opacity: 0.7 }}>{progress.stepIdx}/{progress.totalSteps}</span>
          </div>
        )}
      </div>
      <div className="phase-prog"><i style={{ width: `${secPct}%` }} /></div>
      <div className="phase-log">
        {progress.lastWarn ? `⚠ ${progress.lastWarn}` : `${progress.sinceSec}s · ffmpeg -c:v libx264`}
      </div>
    </>
  );
}

function DonePanel({ sections, wall }: { sections: number; wall: number }) {
  return (
    <>
      <div className="phase-head">
        <span className="pt"><span className="pt-done"><Check /></span>Capture terminée</span>
      </div>
      <div className="phase-log">✓ {sections} section{sections > 1 ? "s" : ""} encodée{sections > 1 ? "s" : ""} · {wall}s wall</div>
    </>
  );
}

function IdlePanel() {
  return (
    <>
      <div className="phase-head">
        <span className="pt">Prêt à filmer</span>
      </div>
      <div className="phase-log">En attente — lance « Capturer les sections ».</div>
    </>
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
  const [dragSrc, setDragSrc] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);

  const handleDrop = async (srcIdx: number, destIdx: number) => {
    if (srcIdx === destIdx) return;
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
      onSectionRecaptured();
    } catch (e) {
      setReorderError((e as Error).message);
    }
  };

  return (
    <div>
      <div className="cap-results-head">
        <span className="ct">
          {sections.length} section{sections.length > 1 ? "s" : ""} capturée{sections.length > 1 ? "s" : ""}
        </span>
        <span className="cs">
          <span>{totalDurationSec.toFixed(1)}s</span>
          <span>·</span>
          <span>{(totalSizeBytes / 1024 / 1024).toFixed(1)} MB</span>
          <span>·</span>
          <span>{captureWallTimeSec}s wall</span>
        </span>
      </div>

      {reorderError && (
        <div className="mb-3 rounded-[var(--r-md)] border border-[oklch(60%_0.14_25_/_0.4)] bg-[oklch(95%_0.04_25_/_0.5)] p-3 text-xs text-ink">
          Erreur reorder : {reorderError}
        </div>
      )}

      <div className="cap-grid">
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

      <SectionLightbox
        section={zoom}
        tourId={tourId}
        onClose={() => setZoom(null)}
        onSectionUpdated={onSectionRecaptured}
      />
    </div>
  );
}

/**
 * Bannière de préparation mobile — affichée uniquement pour un tour
 * iOS/Android quand des outils manquent (sinon rien, pas de bruit). Évite
 * un échec cryptique au clic « Capturer ».
 */
function MobileReadiness({ platform }: { platform: "ios" | "android" }) {
  const [status, setStatus] = useState<null | {
    platforms: { ios: boolean; android: boolean };
    maestro: { present: boolean };
    adb: { present: boolean };
    simctl: { present: boolean };
  }>(null);

  useEffect(() => {
    fetch("/api/motion/mobile/status")
      .then((r) => (r.ok ? r.json() : null))
      .then(setStatus)
      .catch(() => {});
  }, []);

  if (!status) return null;
  const ready =
    platform === "ios" ? status.platforms.ios : status.platforms.android;
  if (ready) return null; // tout est prêt → on ne pollue pas

  const missing: string[] = [];
  if (!status.maestro.present) missing.push("Maestro");
  if (platform === "ios" && !status.simctl.present) missing.push("Xcode / Simulateur");
  if (platform === "android" && !status.adb.present) missing.push("adb");

  return (
    <div
      data-wm-id="editor.capture.mobile-readiness"
      className="mb-4 flex items-start gap-2 rounded-[var(--r-lg)] border border-amber-200 bg-amber-50 px-4 py-3"
    >
      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" strokeWidth={2.5} />
      <p className="text-xs text-amber-900">
        Outils {platform} manquants : <strong>{missing.join(" · ")}</strong>. La
        capture mobile échouera tant qu&apos;ils ne sont pas installés.{" "}
        <a href="/help#mobile" className="underline font-medium">
          Comment installer
        </a>
      </p>
    </div>
  );
}
