"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  HiOutlineArrowLeft,
  HiOutlineCursorClick,
  HiOutlineExternalLink,
  HiOutlineSparkles,
  HiOutlineFilm,
  HiOutlineEye,
  HiOutlineRefresh,
  HiOutlineDownload,
  HiOutlineExclamationCircle,
  HiOutlineCollection,
  HiOutlineMusicNote,
  HiOutlineUpload,
  HiOutlineTrash,
  HiOutlinePlay,
  HiOutlineMicrophone,
} from "react-icons/hi";
import type { TourStep, TourEntry } from "@/lib/types/tour";
import {
  getCategory,
  type MotionCategory,
} from "@/lib/motion-categories";
import { UZME } from "@/lib/brand";

/**
 * Client side of the tour preview page. The server `page.tsx`
 * loads the tour via `getTour()` (fs read) and passes it down here.
 */
export default function TourClient({ tour }: { tour: TourEntry }) {
  return <TourPreview tour={tour} />;
}

interface CapturedSection {
  index: number;
  categoryId: string;
  title: string;
  subtitle?: string;
  mp4Url: string;
  durationSec: number;
  sizeBytes: number;
  frames: number;
}

interface RunningProgress {
  /** High-level phase label (e.g. "Section 2/3 · Pipeline · Splash") */
  phase: string;
  /** Current section index (1-based) when emitted by runner */
  sectionIdx?: number;
  /** Total sections in the tour */
  totalSections?: number;
  /** Current step within the section */
  stepIdx?: number;
  /** Total steps in the section */
  totalSteps?: number;
  /** Step type (click, scroll, overlay, …) */
  stepType?: string;
  /** Frames captured (compose only) */
  frames?: number;
  /** Wall-clock seconds elapsed since spawn */
  sinceSec: number;
  /** Last warning message (non-fatal step skip), if any */
  lastWarn?: string;
}

type CaptureState =
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

type ComposeState =
  | { kind: "idle" }
  | { kind: "running"; progress: RunningProgress }
  | {
      kind: "ready";
      finalUrl: string;
      sizeBytes: number;
      captureWallTimeSec: number;
    }
  | { kind: "error"; message: string };

type VoState =
  | { kind: "idle" }
  | { kind: "running"; progress: RunningProgress }
  | {
      kind: "ready";
      voiceoverUrl: string;
      captureWallTimeSec: number;
    }
  | { kind: "error"; message: string };

interface AudioTrack {
  id: string;
  originalName: string;
  filename: string;
  sizeBytes: number;
  durationSec: number;
  uploadedAt: string;
}

function TourPreview({ tour }: { tour: TourEntry }) {
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [capture, setCapture] = useState<CaptureState>({ kind: "idle" });
  const [compose, setCompose] = useState<ComposeState>({ kind: "idle" });
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  // bgMusicId state: undefined = use catalogue default, ""= explicit
  // "no music", "<id>" = library track override. Persisted to
  // localStorage so the selection survives reloads — without this,
  // composing after a reload silently dropped the bg music because
  // state defaulted to undefined and the catalogue default was none.
  const bgMusicKey = `motion-bg-music:${tour.id}`;
  const [bgMusicId, setBgMusicIdState] = useState<string | undefined>(undefined);
  const setBgMusicId = (next: string | undefined) => {
    setBgMusicIdState(next);
    try {
      if (next === undefined) localStorage.removeItem(bgMusicKey);
      else localStorage.setItem(bgMusicKey, next);
    } catch {}
  };
  const [vo, setVo] = useState<VoState>({ kind: "idle" });
  // Per-step VO text overrides keyed by tour.steps[i] linear index.
  // Persisted to localStorage so edits survive reloads. Empty string =
  // explicit silence override.
  const overridesKey = `motion-vo-overrides:${tour.id}`;
  const [voOverrides, setVoOverrides] = useState<Record<string, string>>({});
  // Format override for the next capture. Defaults to the catalogue
  // format. localStorage'd so a user's last choice sticks across
  // page reloads.
  const formatKey = `motion-format:${tour.id}`;
  const [captureFormat, setCaptureFormatState] = useState<"16:9" | "9:16">(
    tour.format ?? "16:9",
  );
  const setCaptureFormat = (f: "16:9" | "9:16") => {
    setCaptureFormatState(f);
    try {
      localStorage.setItem(formatKey, f);
    } catch {}
  };
  // Volume sliders. Defaults match the runner (0.18 music alone, 1.0 VO).
  const volumesKey = `motion-volumes:${tour.id}`;
  const [bgMusicVolume, setBgMusicVolume] = useState<number>(0.18);
  const [voVolume, setVoVolume] = useState<number>(1.0);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const composeTickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const voTickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(overridesKey);
      if (raw) setVoOverrides(JSON.parse(raw));
      const vraw = localStorage.getItem(volumesKey);
      if (vraw) {
        const v = JSON.parse(vraw) as { bg?: number; vo?: number };
        if (typeof v.bg === "number") setBgMusicVolume(v.bg);
        if (typeof v.vo === "number") setVoVolume(v.vo);
      }
      const bg = localStorage.getItem(bgMusicKey);
      if (bg !== null) setBgMusicIdState(bg);
      const f = localStorage.getItem(formatKey);
      if (f === "9:16" || f === "16:9") setCaptureFormatState(f);
    } catch {}
  }, [overridesKey, volumesKey, bgMusicKey, formatKey]);

  // Auto-load existing artifacts from disk so a returning session
  // doesn't have to re-run Capturer + Generate VO + Compose.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/motion/tour/status?id=${encodeURIComponent(tour.id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (data.hasManifest && data.manifest) {
          const cacheBust = Date.now();
          const sections: CapturedSection[] = data.manifest.sections.map(
            (s: CapturedSection & { mp4Url: string }) => ({
              ...s,
              mp4Url: `${s.mp4Url}&_t=${cacheBust}`,
            }),
          );
          setCapture({
            kind: "ready",
            sections,
            totalDurationSec: Number(data.manifest.totalDurationSec ?? 0),
            totalSizeBytes: Number(data.manifest.totalSizeBytes ?? 0),
            captureWallTimeSec: 0,
          });
        }
        if (data.hasVoiceover && data.voiceoverUrl) {
          setVo({
            kind: "ready",
            voiceoverUrl: String(data.voiceoverUrl),
            captureWallTimeSec: 0,
          });
        }
        if (data.hasFinal && data.finalUrl) {
          setCompose({
            kind: "ready",
            finalUrl: String(data.finalUrl),
            sizeBytes: Number(data.finalSizeBytes ?? 0),
            captureWallTimeSec: 0,
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [tour.id]);

  const saveOverrides = (next: Record<string, string>) => {
    setVoOverrides(next);
    try {
      localStorage.setItem(overridesKey, JSON.stringify(next));
    } catch {}
  };

  const saveVolumes = (bg: number, voV: number) => {
    setBgMusicVolume(bg);
    setVoVolume(voV);
    try {
      localStorage.setItem(volumesKey, JSON.stringify({ bg, vo: voV }));
    } catch {}
  };

  useEffect(() => {
    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
      if (composeTickerRef.current) clearInterval(composeTickerRef.current);
      if (voTickerRef.current) clearInterval(voTickerRef.current);
    };
  }, []);

  useEffect(() => {
    refreshTracks();
  }, []);

  const refreshTracks = async () => {
    try {
      const res = await fetch("/api/motion/audio");
      if (!res.ok) return;
      const data = await res.json();
      setTracks(data.tracks ?? []);
    } catch {}
  };

  const handleCapture = async () => {
    if (tickerRef.current) clearInterval(tickerRef.current);
    const startedAt = Date.now();
    const initial: RunningProgress = {
      phase: "Lancement…",
      sinceSec: 0,
    };
    setCapture({ kind: "running", progress: initial });
    tickerRef.current = setInterval(() => {
      setCapture((prev) =>
        prev.kind === "running"
          ? {
              kind: "running",
              progress: {
                ...prev.progress,
                sinceSec: Math.round((Date.now() - startedAt) / 1000),
              },
            }
          : prev,
      );
    }, 1000);

    try {
      const res = await fetch("/api/motion/tour/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tourId: tour.id,
          formatOverride: captureFormat,
        }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        if (tickerRef.current) clearInterval(tickerRef.current);
        setCapture({ kind: "error", message: err.error });
        return;
      }
      await consumeNdjson(res.body, (evt) => {
        if (evt.type === "phase") {
          setCapture((prev) =>
            prev.kind === "running"
              ? {
                  kind: "running",
                  progress: { ...prev.progress, phase: String(evt.label ?? "") },
                }
              : prev,
          );
        } else if (evt.type === "section") {
          const idx = Number(evt.index);
          const total = Number(evt.total);
          const title = String(evt.title ?? "");
          const cat = String(evt.category ?? "");
          setCapture((prev) =>
            prev.kind === "running"
              ? {
                  kind: "running",
                  progress: {
                    ...prev.progress,
                    phase: `Section ${idx}/${total} · ${cat} · ${title}`,
                    sectionIdx: idx,
                    totalSections: total,
                    stepIdx: undefined,
                    totalSteps: undefined,
                    stepType: undefined,
                  },
                }
              : prev,
          );
        } else if (evt.type === "step") {
          setCapture((prev) =>
            prev.kind === "running"
              ? {
                  kind: "running",
                  progress: {
                    ...prev.progress,
                    stepIdx: Number(evt.index),
                    totalSteps: Number(evt.total),
                    stepType: String(evt.stepType ?? ""),
                  },
                }
              : prev,
          );
        } else if (evt.type === "warn") {
          setCapture((prev) =>
            prev.kind === "running"
              ? {
                  kind: "running",
                  progress: { ...prev.progress, lastWarn: String(evt.message ?? "") },
                }
              : prev,
          );
        } else if (evt.type === "done" && evt.ok) {
          if (tickerRef.current) clearInterval(tickerRef.current);
          setCapture({
            kind: "ready",
            sections: (evt.sections as CapturedSection[]) ?? [],
            totalDurationSec: Number(evt.totalDurationSec ?? 0),
            totalSizeBytes: Number(evt.totalSizeBytes ?? 0),
            captureWallTimeSec: Number(evt.captureWallTimeSec ?? 0),
          });
        } else if (evt.type === "error") {
          if (tickerRef.current) clearInterval(tickerRef.current);
          setCapture({
            kind: "error",
            message: String(evt.message ?? "Erreur inconnue"),
          });
        }
      });
    } catch (e) {
      if (tickerRef.current) clearInterval(tickerRef.current);
      setCapture({
        kind: "error",
        message: e instanceof Error ? e.message : "Network error",
      });
    }
  };

  const isRunning = capture.kind === "running";
  const isComposing = compose.kind === "running";
  const isGeneratingVo = vo.kind === "running";

  const handleGenerateVo = async () => {
    if (voTickerRef.current) clearInterval(voTickerRef.current);
    const startedAt = Date.now();
    setVo({
      kind: "running",
      progress: { phase: "Lancement de la génération VO…", sinceSec: 0 },
    });
    voTickerRef.current = setInterval(() => {
      setVo((prev) =>
        prev.kind === "running"
          ? {
              kind: "running",
              progress: {
                ...prev.progress,
                sinceSec: Math.round((Date.now() - startedAt) / 1000),
              },
            }
          : prev,
      );
    }, 1000);

    try {
      const res = await fetch("/api/motion/tour/audio/voice/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tourId: tour.id,
          voiceoverOverrides: voOverrides,
        }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        if (voTickerRef.current) clearInterval(voTickerRef.current);
        setVo({ kind: "error", message: err.error });
        return;
      }
      await consumeNdjson(res.body, (evt) => {
        if (evt.type === "phase") {
          setVo((prev) =>
            prev.kind === "running"
              ? {
                  kind: "running",
                  progress: {
                    ...prev.progress,
                    phase: String(evt.label ?? ""),
                    sectionIdx:
                      evt.sectionIdx !== undefined
                        ? Number(evt.sectionIdx)
                        : prev.progress.sectionIdx,
                    totalSections:
                      evt.totalSections !== undefined
                        ? Number(evt.totalSections)
                        : prev.progress.totalSections,
                  },
                }
              : prev,
          );
        } else if (evt.type === "warn") {
          setVo((prev) =>
            prev.kind === "running"
              ? {
                  kind: "running",
                  progress: { ...prev.progress, lastWarn: String(evt.message ?? "") },
                }
              : prev,
          );
        } else if (evt.type === "done" && evt.ok) {
          if (voTickerRef.current) clearInterval(voTickerRef.current);
          setVo({
            kind: "ready",
            voiceoverUrl: String(evt.voiceoverUrl ?? ""),
            captureWallTimeSec: Number(evt.captureWallTimeSec ?? 0),
          });
        } else if (evt.type === "error") {
          if (voTickerRef.current) clearInterval(voTickerRef.current);
          setVo({ kind: "error", message: String(evt.message ?? "Erreur inconnue") });
        }
      });
    } catch (e) {
      if (voTickerRef.current) clearInterval(voTickerRef.current);
      setVo({ kind: "error", message: e instanceof Error ? e.message : "Network error" });
    }
  };

  const handleCompose = async () => {
    if (composeTickerRef.current) clearInterval(composeTickerRef.current);
    const startedAt = Date.now();
    setCompose({
      kind: "running",
      progress: { phase: "Lancement du compositor…", sinceSec: 0 },
    });
    composeTickerRef.current = setInterval(() => {
      setCompose((prev) =>
        prev.kind === "running"
          ? {
              kind: "running",
              progress: {
                ...prev.progress,
                sinceSec: Math.round((Date.now() - startedAt) / 1000),
              },
            }
          : prev,
      );
    }, 1000);

    try {
      const res = await fetch("/api/motion/tour/compose/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tourId: tour.id,
          bgMusicId,
          bgMusicVolume,
          voiceoverVolume: voVolume,
        }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        if (composeTickerRef.current) clearInterval(composeTickerRef.current);
        setCompose({ kind: "error", message: err.error });
        return;
      }
      await consumeNdjson(res.body, (evt) => {
        if (evt.type === "phase") {
          setCompose((prev) =>
            prev.kind === "running"
              ? {
                  kind: "running",
                  progress: { ...prev.progress, phase: String(evt.label ?? "") },
                }
              : prev,
          );
        } else if (evt.type === "progress") {
          setCompose((prev) =>
            prev.kind === "running"
              ? {
                  kind: "running",
                  progress: {
                    ...prev.progress,
                    frames: Number(evt.frames),
                  },
                }
              : prev,
          );
        } else if (evt.type === "done" && evt.ok) {
          if (composeTickerRef.current) clearInterval(composeTickerRef.current);
          setCompose({
            kind: "ready",
            finalUrl: String(evt.finalUrl ?? ""),
            sizeBytes: Number(evt.sizeBytes ?? 0),
            captureWallTimeSec: Number(evt.captureWallTimeSec ?? 0),
          });
        } else if (evt.type === "error") {
          if (composeTickerRef.current) clearInterval(composeTickerRef.current);
          setCompose({
            kind: "error",
            message: String(evt.message ?? "Erreur inconnue"),
          });
        }
      });
    } catch (e) {
      if (composeTickerRef.current) clearInterval(composeTickerRef.current);
      setCompose({
        kind: "error",
        message: e instanceof Error ? e.message : "Network error",
      });
    }
  };

  /**
   * Reads an NDJSON stream and dispatches each parsed object to the
   * provided handler. Streams from `/api/motion/tour/run` and
   * `/api/motion/tour/compose/run`.
   */
  async function consumeNdjson(
    body: ReadableStream<Uint8Array>,
    handle: (evt: Record<string, unknown>) => void,
  ): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line) continue;
        try {
          const evt = JSON.parse(line) as Record<string, unknown>;
          handle(evt);
        } catch {
          /* malformed line — skip */
        }
      }
    }
    if (buf) {
      try {
        const evt = JSON.parse(buf) as Record<string, unknown>;
        handle(evt);
      } catch {}
    }
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <Link
            href="/admin/motion-studio"
            className="p-2 rounded-lg transition-colors hover:opacity-70"
            style={{
              backgroundColor: "var(--bg-card)",
              color: "var(--text-muted)",
              border: "1px solid var(--border)",
            }}
          >
            <HiOutlineArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
              {tour.name}
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              {tour.description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={tour.startPath}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
            style={{
              backgroundColor: "var(--bg-card)",
              color: "var(--text)",
              border: "1px solid var(--border)",
            }}
          >
            <HiOutlineExternalLink className="w-4 h-4" />
            Ouvrir la page de départ
          </Link>
          <div
            className="flex items-center rounded-xl overflow-hidden"
            style={{ border: "1px solid var(--border)" }}
            title="Format de capture (chosi le ratio avant de lancer)"
          >
            {(["16:9", "9:16"] as const).map((f) => {
              const active = captureFormat === f;
              return (
                <button
                  key={f}
                  onClick={() => setCaptureFormat(f)}
                  disabled={isRunning}
                  className="px-3 py-2 text-xs font-medium font-mono transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: active ? UZME.primary : "var(--bg-card)",
                    color: active ? "white" : "var(--text-muted)",
                  }}
                >
                  {f}
                </button>
              );
            })}
          </div>
          <button
            onClick={handleCapture}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-80 disabled:cursor-progress"
            style={{ backgroundColor: UZME.primary }}
            title={`Capture ${captureFormat} via Puppeteer en local`}
          >
            {isRunning && capture.kind === "running" ? (
              <>
                <HiOutlineRefresh className="w-4 h-4 animate-spin" />
                Capture · {capture.progress.sinceSec}s
              </>
            ) : (
              <>
                <HiOutlineFilm className="w-4 h-4" />
                Capturer en MP4
              </>
            )}
          </button>
        </div>
      </motion.div>

      {capture.kind === "running" && (
        <PhaseLoader
          accent={UZME.primary}
          icon={<HiOutlineFilm className="w-5 h-5" style={{ color: UZME.primary }} />}
          progress={capture.progress}
          variant="capture"
        />
      )}

      {capture.kind === "ready" && (
        <CaptureResults
          sections={capture.sections}
          totalDurationSec={capture.totalDurationSec}
          totalSizeBytes={capture.totalSizeBytes}
          captureWallTimeSec={capture.captureWallTimeSec}
          tourId={tour.id}
          onRecapture={handleCapture}
          composeState={compose}
          onCompose={handleCompose}
          isComposing={isComposing}
          tracks={tracks}
          bgMusicId={bgMusicId}
          onBgMusicChange={setBgMusicId}
          onTracksChanged={refreshTracks}
          tourBgMusic={tour.bgMusic}
          tour={tour}
          voState={vo}
          onGenerateVo={handleGenerateVo}
          isGeneratingVo={isGeneratingVo}
          voOverrides={voOverrides}
          onVoOverridesChange={saveOverrides}
          bgMusicVolume={bgMusicVolume}
          voVolume={voVolume}
          onVolumesChange={saveVolumes}
        />
      )}

      {capture.kind === "error" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 flex items-start gap-3"
          style={{
            backgroundColor: "rgba(225, 112, 85, 0.1)",
            border: "1px solid rgba(225, 112, 85, 0.4)",
          }}
        >
          <HiOutlineExclamationCircle
            className="w-5 h-5 flex-shrink-0 mt-0.5"
            style={{ color: UZME.error }}
          />
          <div className="flex-1 min-w-0">
            <p
              className="font-semibold text-sm"
              style={{ color: UZME.error }}
            >
              Capture échouée
            </p>
            <p
              className="text-xs mt-1 whitespace-pre-wrap break-words font-mono"
              style={{ color: "var(--text-muted)" }}
            >
              {capture.message}
            </p>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl p-5 grid grid-cols-3 gap-4"
        style={{ backgroundColor: "var(--bg-card)" }}
      >
        <Stat label="Étapes" value={String(tour.steps.length)} />
        <Stat
          label="Durée estimée"
          value={`~${tour.estimatedSec}s`}
        />
        <Stat
          label="Auth requise"
          value={tour.auth === "admin" ? "superAdmin" : "—"}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl p-5"
        style={{ backgroundColor: "var(--bg-card)" }}
      >
        <h2 className="font-semibold mb-4" style={{ color: "var(--text)" }}>
          Script du tour
        </h2>
        <ol className="space-y-2">
          {tour.steps.map((step, i) => (
            <StepRow
              key={i}
              step={step}
              index={i}
              isActive={activeStep === i}
              onHover={() => setActiveStep(i)}
              onLeave={() => setActiveStep(null)}
            />
          ))}
        </ol>
      </motion.div>
    </div>
  );
}

/**
 * Audio library widget. Shows a horizontal list of uploaded tracks
 * (chips), an upload button, and a "no music" toggle. Hands the
 * selected bgMusicId back to the tour preview which forwards it to
 * /api/motion/tour/compose/run.
 *
 * Three logical states for the selection:
 *   - bgMusicId === undefined → use catalogue default (tour.bgMusic)
 *   - bgMusicId === ""        → explicit "no music" override
 *   - bgMusicId === "<id>"    → library track override
 */
function MusicLibrary({
  tracks,
  bgMusicId,
  onBgMusicChange,
  onTracksChanged,
  tourBgMusic,
}: {
  tracks: AudioTrack[];
  bgMusicId: string | undefined;
  onBgMusicChange: (id: string | undefined) => void;
  onTracksChanged: () => void;
  tourBgMusic?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/motion/audio", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setUploadErr(data.error || `HTTP ${res.status}`);
        return;
      }
      onTracksChanged();
      onBgMusicChange(data.track.id);
    } catch (e) {
      setUploadErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/motion/audio/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      onTracksChanged();
      if (bgMusicId === id) onBgMusicChange(undefined);
    } catch {}
  };

  const usingDefault = bgMusicId === undefined;
  const usingNone = bgMusicId === "";
  const usingTrackId = bgMusicId && bgMusicId !== "" ? bgMusicId : null;

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{
        backgroundColor: "var(--bg)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <HiOutlineMusicNote
            className="w-4 h-4"
            style={{ color: UZME.tertiary }}
          />
          <p
            className="font-semibold text-sm"
            style={{ color: "var(--text)" }}
          >
            Musique de fond
          </p>
          {usingDefault && tourBgMusic && (
            <span
              className="text-[11px] px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: "rgba(0,206,201,0.15)",
                color: UZME.tertiary,
              }}
              title={`Catalogue default: ${tourBgMusic}`}
            >
              défaut catalogue
            </span>
          )}
          {usingNone && (
            <span
              className="text-[11px] px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: "rgba(255,255,255,0.06)",
                color: "var(--text-muted)",
              }}
            >
              sans musique
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onBgMusicChange("")}
            className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all hover:opacity-80"
            style={{
              backgroundColor: usingNone ? UZME.tertiary : "var(--bg-card)",
              color: usingNone ? "white" : "var(--text-muted)",
              border: "1px solid var(--border)",
            }}
          >
            Sans musique
          </button>
          <button
            onClick={() => onBgMusicChange(undefined)}
            className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all hover:opacity-80"
            style={{
              backgroundColor: usingDefault ? UZME.tertiary : "var(--bg-card)",
              color: usingDefault ? "white" : "var(--text-muted)",
              border: "1px solid var(--border)",
            }}
            title="Réutilise tour.bgMusic du catalogue, ou aucune musique si non défini"
          >
            Défaut
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/mp3,audio/mpeg,audio/wav,audio/m4a,audio/aac,audio/ogg,.mp3,.wav,.m4a,.aac,.ogg"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-white transition-all hover:opacity-90 disabled:opacity-70"
            style={{ backgroundColor: UZME.tertiary }}
          >
            {uploading ? (
              <HiOutlineRefresh className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <HiOutlineUpload className="w-3.5 h-3.5" />
            )}
            Upload
          </button>
        </div>
      </div>

      {tracks.length === 0 ? (
        <p
          className="text-xs"
          style={{ color: "var(--text-muted)", lineHeight: 1.5 }}
        >
          Aucun morceau dans la librairie. Upload un MP3 / WAV / M4A
          (royalty-free, ≤ 25 MB) ou laisse <span className="font-mono">tour.bgMusic</span>{" "}
          défini dans le catalogue prendre le relais.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {tracks.map((t) => {
            const selected = usingTrackId === t.id;
            return (
              <div
                key={t.id}
                onClick={() => onBgMusicChange(t.id)}
                className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all hover:opacity-90"
                style={{
                  backgroundColor: selected
                    ? `${UZME.tertiary}20`
                    : "var(--bg-card)",
                  border: `1px solid ${selected ? UZME.tertiary : "var(--border)"}`,
                }}
              >
                <span
                  className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: selected
                      ? UZME.tertiary
                      : "rgba(0,206,201,0.15)",
                    color: selected ? "white" : UZME.tertiary,
                  }}
                >
                  <HiOutlineMusicNote className="w-3.5 h-3.5" />
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm truncate font-medium"
                    style={{ color: "var(--text)" }}
                  >
                    {t.originalName}
                  </p>
                  <p
                    className="text-[11px] truncate"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {t.durationSec > 0
                      ? `${formatDur(t.durationSec)} · `
                      : ""}
                    {(t.sizeBytes / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
                <audio
                  src={`/api/motion/audio/${encodeURIComponent(t.id)}/stream`}
                  controls
                  preload="none"
                  className="h-7"
                  style={{
                    maxWidth: 220,
                    accentColor: UZME.tertiary,
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (
                      window.confirm(
                        `Supprimer "${t.originalName}" de la librairie ?`,
                      )
                    ) {
                      handleDelete(t.id);
                    }
                  }}
                  className="p-1.5 rounded-md transition-colors hover:opacity-80"
                  style={{
                    color: "var(--text-muted)",
                    backgroundColor: "transparent",
                  }}
                  title="Supprimer"
                >
                  <HiOutlineTrash className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {uploadErr && (
        <p
          className="text-xs font-mono"
          style={{ color: UZME.error }}
        >
          {uploadErr}
        </p>
      )}
    </div>
  );
}

function formatDur(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Voice-over panel. Lists each step that supports VO (section /
 * overlay / scroll / wait / hover) with an inline `<textarea>` to
 * override the catalogue's default text. Edits persist to
 * localStorage and are sent to the runner on "Générer".
 *
 * Also exposes two volume sliders (bg music / VO) and a hint badge
 * showing how many steps carry voiceover after merging overrides.
 */
function VoiceoverPanel({
  tour,
  voState,
  onGenerateVo,
  isGeneratingVo,
  voOverrides,
  onVoOverridesChange,
  bgMusicVolume,
  voVolume,
  onVolumesChange,
}: {
  tour: TourEntry;
  voState: VoState;
  onGenerateVo: () => void;
  isGeneratingVo: boolean;
  voOverrides: Record<string, string>;
  onVoOverridesChange: (next: Record<string, string>) => void;
  bgMusicVolume: number;
  voVolume: number;
  onVolumesChange: (bg: number, vo: number) => void;
}) {
  // Steps that support VO. Catalogue text is the default; overrides
  // win. Empty-string override = explicit silence for that step.
  const voEligibleSteps = tour.steps.flatMap((step, linearIdx) => {
    if (
      step.type !== "section" &&
      step.type !== "overlay" &&
      step.type !== "scroll" &&
      step.type !== "wait" &&
      step.type !== "hover"
    ) {
      return [];
    }
    const baseText = (step as { voiceover?: string }).voiceover ?? "";
    const override = voOverrides[String(linearIdx)];
    const effectiveText = override !== undefined ? override : baseText;
    return [{ linearIdx, step, effectiveText }];
  });

  const activeCount = voEligibleSteps.filter((s) => s.effectiveText.trim().length > 0).length;
  const hasAnyVoiceover = activeCount > 0;

  const stepLabel = (s: TourStep): string => {
    switch (s.type) {
      case "section":
        return `▸ ${s.title}`;
      case "overlay":
        return `overlay · "${s.text}"`;
      case "scroll":
        return `scroll → ${s.to}px`;
      case "wait":
        return `wait ${s.dwellMs}ms`;
      case "hover":
        return `hover ${s.selector}`;
      default:
        return s.type;
    }
  };

  const updateOverride = (linearIdx: number, value: string, base: string) => {
    const next = { ...voOverrides };
    if (value === base) {
      // Restored to catalogue default — drop the override.
      delete next[String(linearIdx)];
    } else {
      next[String(linearIdx)] = value;
    }
    onVoOverridesChange(next);
  };

  const resetOverrides = () => {
    onVoOverridesChange({});
  };

  const overrideCount = Object.keys(voOverrides).length;

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{
        backgroundColor: "var(--bg)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <HiOutlineMicrophone
            className="w-4 h-4"
            style={{ color: UZME.tertiary }}
          />
          <p
            className="font-semibold text-sm"
            style={{ color: "var(--text)" }}
          >
            Voix off · ElevenLabs
          </p>
          <span
            className="text-[11px] px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: "rgba(0,206,201,0.15)",
              color: UZME.tertiary,
            }}
          >
            {activeCount} VO active{activeCount > 1 ? "s" : ""} ·{" "}
            {voEligibleSteps.length} étapes éligibles
          </span>
          {overrideCount > 0 && (
            <button
              onClick={resetOverrides}
              className="text-[11px] px-1.5 py-0.5 rounded transition-colors hover:opacity-80"
              style={{
                backgroundColor: "rgba(245,158,11,0.15)",
                color: "#F59E0B",
              }}
              title="Réinitialise tous les overrides aux textes du catalogue"
            >
              {overrideCount} override{overrideCount > 1 ? "s" : ""} · reset
            </button>
          )}
        </div>
        <button
          onClick={onGenerateVo}
          disabled={isGeneratingVo || !hasAnyVoiceover}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ backgroundColor: UZME.tertiary }}
          title={
            !hasAnyVoiceover
              ? "Aucune VO active — écris un texte pour au moins une étape"
              : "Génère la VO via ElevenLabs (cache auto sur textes inchangés)"
          }
        >
          {isGeneratingVo && voState.kind === "running" ? (
            <>
              <HiOutlineRefresh className="w-3.5 h-3.5 animate-spin" />
              Génération · {voState.progress.sinceSec}s
            </>
          ) : (
            <>
              <HiOutlineMicrophone className="w-3.5 h-3.5" />
              Générer la voix off
            </>
          )}
        </button>
      </div>

      <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1">
        {voEligibleSteps.map(({ linearIdx, step, effectiveText }) => {
          const baseText = (step as { voiceover?: string }).voiceover ?? "";
          const isOverridden = voOverrides[String(linearIdx)] !== undefined;
          const isActive = effectiveText.trim().length > 0;
          return (
            <div
              key={linearIdx}
              className="p-2 rounded-lg"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderLeft: `3px solid ${isActive ? UZME.tertiary : "var(--border)"}`,
              }}
            >
              <div
                className="flex items-center justify-between gap-2 mb-1.5"
              >
                <p
                  className="text-[11px] font-mono uppercase tracking-wider truncate"
                  style={{ color: "var(--text-muted)" }}
                >
                  #{String(linearIdx).padStart(2, "0")} · {stepLabel(step)}
                </p>
                {isOverridden && (
                  <span
                    className="text-[10px] px-1 py-0.5 rounded font-semibold flex-shrink-0"
                    style={{
                      backgroundColor: "rgba(245,158,11,0.2)",
                      color: "#F59E0B",
                    }}
                    title={`Catalogue : « ${baseText || "(vide)"} »`}
                  >
                    OVERRIDE
                  </span>
                )}
              </div>
              <textarea
                value={effectiveText}
                placeholder="Aucune voix off · tape ici pour en ajouter…"
                onChange={(e) =>
                  updateOverride(linearIdx, e.target.value, baseText)
                }
                rows={Math.max(1, Math.min(4, Math.ceil((effectiveText.length || 0) / 80) || 1))}
                className="w-full text-xs font-mono p-2 rounded-md resize-y"
                style={{
                  backgroundColor: "var(--bg)",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                  lineHeight: 1.5,
                  fontFamily: "inherit",
                  fontStyle: "italic",
                }}
              />
            </div>
          );
        })}
      </div>

      <VolumeControls
        bgMusicVolume={bgMusicVolume}
        voVolume={voVolume}
        onChange={onVolumesChange}
      />

      {voState.kind === "ready" && (
        <div
          className="rounded-lg p-3 flex items-center gap-3"
          style={{
            backgroundColor: "rgba(0,206,201,0.10)",
            border: `1px solid ${UZME.tertiary}55`,
          }}
        >
          <HiOutlinePlay
            className="w-4 h-4 flex-shrink-0"
            style={{ color: UZME.tertiary }}
          />
          <div className="flex-1 min-w-0">
            <p
              className="text-xs font-semibold"
              style={{ color: "var(--text)" }}
            >
              voiceover.mp3 prêt
            </p>
            <p
              className="text-[11px]"
              style={{ color: "var(--text-muted)" }}
            >
              Généré en {voState.captureWallTimeSec}s · auto-mixé au prochain
              compose
            </p>
          </div>
          <audio
            src={voState.voiceoverUrl}
            controls
            preload="none"
            className="h-7"
            style={{ maxWidth: 240, accentColor: UZME.tertiary }}
          />
        </div>
      )}

      {voState.kind === "error" && (
        <div
          className="rounded-lg p-2.5 flex items-start gap-2"
          style={{
            backgroundColor: "rgba(225,112,85,0.1)",
            border: "1px solid rgba(225,112,85,0.4)",
          }}
        >
          <HiOutlineExclamationCircle
            className="w-4 h-4 flex-shrink-0 mt-0.5"
            style={{ color: UZME.error }}
          />
          <p
            className="text-xs font-mono"
            style={{ color: "var(--text-muted)" }}
          >
            {voState.message}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Two-slider audio mixer for the compose step. Volumes sit between
 * 0 and 1 in the slider but the runner clamps them up to 2 so power
 * users can boost a quiet VO file beyond unity gain.
 */
function VolumeControls({
  bgMusicVolume,
  voVolume,
  onChange,
}: {
  bgMusicVolume: number;
  voVolume: number;
  onChange: (bg: number, vo: number) => void;
}) {
  return (
    <div
      className="rounded-lg p-3 grid grid-cols-1 sm:grid-cols-2 gap-3"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
      }}
    >
      <Slider
        label="Volume musique"
        value={bgMusicVolume}
        onChange={(v) => onChange(v, voVolume)}
        accent={UZME.tertiary}
        hint="0.18 par défaut · auto-ducké à 0.10 si VO présente"
      />
      <Slider
        label="Volume voix off"
        value={voVolume}
        onChange={(v) => onChange(bgMusicVolume, v)}
        accent={UZME.tertiary}
        hint="1.0 par défaut · 1.5 boost · 0.6 atténuation"
      />
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
  accent,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  accent: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <p
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--text-muted)" }}
        >
          {label}
        </p>
        <p
          className="text-xs font-mono"
          style={{ color: "var(--text)" }}
        >
          {value.toFixed(2)}
        </p>
      </div>
      <input
        type="range"
        min={0}
        max={1.5}
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
        style={{ accentColor: accent }}
      />
      {hint && (
        <p
          className="text-[10px]"
          style={{ color: "var(--text-muted)", lineHeight: 1.3 }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * Vertical, animated status panel shown while a capture or compose
 * is in flight. Reads from RunningProgress and renders:
 * - Big phase label with spinning icon
 * - Section progress bar (capture only) when totalSections is known
 * - Step counter (capture only) for the current section
 * - Frame counter (compose only) — no bar because total is unknown
 * - Elapsed time + last warning if any
 */
function PhaseLoader({
  accent,
  icon,
  progress,
  variant,
}: {
  accent: string;
  icon: React.ReactNode;
  progress: RunningProgress;
  variant: "capture" | "compose";
}) {
  const sectionPct =
    progress.sectionIdx && progress.totalSections
      ? Math.min(100, Math.round((progress.sectionIdx / progress.totalSections) * 100))
      : null;
  const stepPct =
    progress.stepIdx && progress.totalSteps
      ? Math.min(100, Math.round((progress.stepIdx / progress.totalSteps) * 100))
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{
        backgroundColor: "var(--bg-card)",
        borderLeft: `3px solid ${accent}`,
      }}
    >
      <div className="flex items-center gap-3">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
          className="flex-shrink-0"
        >
          {icon}
        </motion.div>
        <div className="flex-1 min-w-0">
          <p
            key={progress.phase}
            className="font-semibold text-sm truncate"
            style={{ color: "var(--text)" }}
          >
            {progress.phase}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {progress.sinceSec}s écoulées
            {variant === "compose" && progress.frames !== undefined
              ? ` · ${progress.frames} frames capturées`
              : ""}
          </p>
        </div>
      </div>

      {sectionPct !== null && (
        <div>
          <div
            className="flex items-center justify-between mb-1.5"
            style={{ color: "var(--text-muted)" }}
          >
            <p className="text-xs uppercase tracking-wider font-semibold">
              Sections
            </p>
            <p className="text-xs font-mono">
              {progress.sectionIdx}/{progress.totalSections}
            </p>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: "var(--bg)" }}
          >
            <motion.div
              animate={{ width: `${sectionPct}%` }}
              transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
              className="h-full rounded-full"
              style={{ backgroundColor: accent }}
            />
          </div>
        </div>
      )}

      {stepPct !== null && progress.stepType && (
        <div>
          <div
            className="flex items-center justify-between mb-1.5"
            style={{ color: "var(--text-muted)" }}
          >
            <p className="text-xs uppercase tracking-wider font-semibold">
              Étape · {progress.stepType}
            </p>
            <p className="text-xs font-mono">
              {progress.stepIdx}/{progress.totalSteps}
            </p>
          </div>
          <div
            className="h-1 rounded-full overflow-hidden"
            style={{ backgroundColor: "var(--bg)" }}
          >
            <motion.div
              animate={{ width: `${stepPct}%` }}
              transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
              className="h-full rounded-full"
              style={{ backgroundColor: `${accent}99` }}
            />
          </div>
        </div>
      )}

      {progress.lastWarn && (
        <div
          className="flex items-start gap-2 p-2 rounded-lg"
          style={{
            backgroundColor: "rgba(245,158,11,0.1)",
            border: "1px solid rgba(245,158,11,0.3)",
          }}
        >
          <HiOutlineExclamationCircle
            className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
            style={{ color: "#F59E0B" }}
          />
          <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
            {progress.lastWarn}
          </p>
        </div>
      )}
    </motion.div>
  );
}

function CaptureResults({
  sections,
  totalDurationSec,
  totalSizeBytes,
  captureWallTimeSec,
  tourId,
  onRecapture,
  composeState,
  onCompose,
  isComposing,
  tracks,
  bgMusicId,
  onBgMusicChange,
  onTracksChanged,
  tourBgMusic,
  tour,
  voState,
  onGenerateVo,
  isGeneratingVo,
  voOverrides,
  onVoOverridesChange,
  bgMusicVolume,
  voVolume,
  onVolumesChange,
}: {
  sections: CapturedSection[];
  totalDurationSec: number;
  totalSizeBytes: number;
  captureWallTimeSec: number;
  tourId: string;
  onRecapture: () => void;
  composeState: ComposeState;
  onCompose: () => void;
  isComposing: boolean;
  tracks: AudioTrack[];
  bgMusicId: string | undefined;
  onBgMusicChange: (id: string | undefined) => void;
  onTracksChanged: () => void;
  tourBgMusic?: string;
  tour: TourEntry;
  voState: VoState;
  onGenerateVo: () => void;
  isGeneratingVo: boolean;
  voOverrides: Record<string, string>;
  onVoOverridesChange: (next: Record<string, string>) => void;
  bgMusicVolume: number;
  voVolume: number;
  onVolumesChange: (bg: number, vo: number) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 space-y-4"
      style={{ backgroundColor: "var(--bg-card)" }}
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <HiOutlineCollection
            className="w-5 h-5"
            style={{ color: UZME.primary }}
          />
          <h2 className="font-semibold" style={{ color: "var(--text)" }}>
            {sections.length} clip{sections.length > 1 ? "s" : ""} capturé
            {sections.length > 1 ? "s" : ""}
          </h2>
        </div>
        <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: "var(--text-muted)" }}>
          <span>
            Total <span style={{ color: "var(--text)" }}>{totalDurationSec.toFixed(1)}s</span>
          </span>
          <span>·</span>
          <span>
            <span style={{ color: "var(--text)" }}>
              {(totalSizeBytes / 1024 / 1024).toFixed(1)} MB
            </span>
          </span>
          <span>·</span>
          <span>
            Capture wall time{" "}
            <span style={{ color: "var(--text)" }}>{captureWallTimeSec}s</span>
          </span>
        </div>
      </div>

      <MusicLibrary
        tracks={tracks}
        bgMusicId={bgMusicId}
        onBgMusicChange={onBgMusicChange}
        onTracksChanged={onTracksChanged}
        tourBgMusic={tourBgMusic}
      />

      <VoiceoverPanel
        tour={tour}
        voState={voState}
        onGenerateVo={onGenerateVo}
        isGeneratingVo={isGeneratingVo}
        voOverrides={voOverrides}
        onVoOverridesChange={onVoOverridesChange}
        bgMusicVolume={bgMusicVolume}
        voVolume={voVolume}
        onVolumesChange={onVolumesChange}
      />

      {/* Final compose CTA — sits between summary and per-section grid */}
      <div
        className="rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap"
        style={{
          backgroundColor: "var(--bg)",
          border: `1px dashed ${UZME.tertiary}66`,
        }}
      >
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>
            Clip final monté
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Mac chrome animé · bg coloré par catégorie · transitions entre sections · outro card
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/motion-studio/compose/${tourId}`}
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
            style={{
              backgroundColor: "var(--bg-card)",
              color: "var(--text)",
              border: "1px solid var(--border)",
            }}
            title="Aperçu interactif (manuel) dans un nouvel onglet"
          >
            <HiOutlineEye className="w-3.5 h-3.5" />
            Aperçu
          </Link>
          <button
            onClick={onCompose}
            disabled={isComposing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all hover:opacity-90 disabled:opacity-80 disabled:cursor-progress"
            style={{ backgroundColor: UZME.tertiary }}
          >
            {isComposing && composeState.kind === "running" ? (
              <>
                <HiOutlineRefresh className="w-3.5 h-3.5 animate-spin" />
                Compose · {composeState.progress.sinceSec}s
              </>
            ) : (
              <>
                <HiOutlineFilm className="w-3.5 h-3.5" />
                Composer le clip final
              </>
            )}
          </button>
        </div>
      </div>

      {composeState.kind === "running" && (
        <PhaseLoader
          accent={UZME.tertiary}
          icon={<HiOutlineFilm className="w-5 h-5" style={{ color: UZME.tertiary }} />}
          progress={composeState.progress}
          variant="compose"
        />
      )}

      {composeState.kind === "ready" && (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: "var(--bg)",
            border: `2px solid ${UZME.tertiary}`,
          }}
        >
          <div className="p-3 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <HiOutlineFilm
                className="w-4 h-4"
                style={{ color: UZME.tertiary }}
              />
              <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>
                final.mp4
              </p>
            </div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {(composeState.sizeBytes / 1024 / 1024).toFixed(1)} MB · compose wall time {composeState.captureWallTimeSec}s
            </p>
          </div>
          <video
            controls
            autoPlay
            src={composeState.finalUrl}
            className="w-full"
            style={{ backgroundColor: "#000", display: "block" }}
          />
          <div className="p-2 flex items-center gap-2">
            <a
              href={composeState.finalUrl}
              download={`uzme-${tourId}-final.mp4`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all hover:opacity-90"
              style={{ backgroundColor: UZME.tertiary }}
            >
              <HiOutlineDownload className="w-3.5 h-3.5" />
              Télécharger final.mp4
            </a>
          </div>
        </div>
      )}

      {composeState.kind === "error" && (
        <div
          className="rounded-xl p-3 flex items-start gap-2"
          style={{
            backgroundColor: "rgba(225, 112, 85, 0.1)",
            border: "1px solid rgba(225, 112, 85, 0.4)",
          }}
        >
          <HiOutlineExclamationCircle
            className="w-4 h-4 flex-shrink-0 mt-0.5"
            style={{ color: UZME.error }}
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-xs" style={{ color: UZME.error }}>
              Compose échoué
            </p>
            <p
              className="text-xs mt-0.5 whitespace-pre-wrap break-words font-mono"
              style={{ color: "var(--text-muted)" }}
            >
              {composeState.message}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((s) => {
          const cat = getCategory(s.categoryId);
          const accent = cat?.bgColor ?? UZME.primary;
          const accentText = cat?.accent ?? UZME.tertiary;
          return (
            <div
              key={s.index}
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: "var(--bg)",
                border: "1px solid var(--border)",
                borderLeft: `4px solid ${accent}`,
              }}
            >
              <div className="p-4 flex items-start gap-3">
                <span
                  className="px-2 py-0.5 rounded-md text-xs font-mono font-semibold"
                  style={{
                    backgroundColor: `${accent}25`,
                    color: accent,
                    border: `1px solid ${accent}55`,
                  }}
                >
                  {String(s.index).padStart(2, "0")}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className="font-semibold text-sm truncate"
                    style={{ color: "var(--text)" }}
                  >
                    {s.title}
                  </p>
                  {s.subtitle && (
                    <p
                      className="text-xs mt-0.5 truncate"
                      style={{ color: accentText }}
                    >
                      {s.subtitle}
                    </p>
                  )}
                  <p
                    className="text-xs mt-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {s.durationSec.toFixed(1)}s · {(s.sizeBytes / 1024 / 1024).toFixed(1)} MB · {s.frames} frames
                    {cat && (
                      <>
                        {" "}· <span style={{ color: accent }}>{cat.label}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
              <video
                controls
                src={s.mp4Url}
                className="w-full"
                style={{ backgroundColor: "#000", display: "block" }}
              />
              <div className="p-2 flex items-center gap-2">
                <a
                  href={s.mp4Url}
                  download={`uzme-${tourId}-${cat?.id ?? "section"}-${String(s.index).padStart(2, "0")}.mp4`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: accent }}
                >
                  <HiOutlineDownload className="w-3.5 h-3.5" />
                  MP4
                </a>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onRecapture}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
          style={{
            backgroundColor: "var(--bg)",
            color: "var(--text)",
            border: "1px solid var(--border)",
          }}
        >
          Re-capturer
        </button>
      </div>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <p className="font-bold text-lg" style={{ color: "var(--text)" }}>
        {value}
      </p>
    </div>
  );
}

function StepRow({
  step,
  index,
  isActive,
  onHover,
  onLeave,
}: {
  step: TourStep;
  index: number;
  isActive: boolean;
  onHover: () => void;
  onLeave: () => void;
}) {
  const meta = describeStep(step);
  return (
    <li
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className="flex items-start gap-3 p-3 rounded-xl transition-colors"
      style={{
        backgroundColor: isActive ? "var(--bg)" : "transparent",
        border: "1px solid var(--border)",
      }}
    >
      <span
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 font-mono text-xs"
        style={{
          backgroundColor: meta.tint,
          color: meta.color,
          border: `1px solid ${meta.color}40`,
        }}
      >
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="text-xs uppercase font-semibold"
            style={{ color: meta.color }}
          >
            {meta.kind}
          </span>
          {step.dwellMs && (
            <span
              className="text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              · {step.dwellMs}ms
            </span>
          )}
        </div>
        <p
          className="text-sm mt-0.5 truncate"
          style={{ color: "var(--text)" }}
        >
          {meta.summary}
        </p>
      </div>
      {meta.icon}
    </li>
  );
}

function describeStep(step: TourStep): {
  kind: string;
  summary: string;
  tint: string;
  color: string;
  icon: React.ReactNode;
} {
  switch (step.type) {
    case "section": {
      const cat = getCategory(step.categoryId);
      const color = cat?.bgColor ?? UZME.primary;
      return {
        kind: "SECTION",
        summary: step.subtitle
          ? `${step.title} — ${step.subtitle}`
          : step.title,
        tint: `${color}25`,
        color,
        icon: (
          <HiOutlineCollection className="w-4 h-4" style={{ color }} />
        ),
      };
    }
    case "goto":
      return {
        kind: "GO",
        summary: step.url,
        tint: `${UZME.primary}15`,
        color: UZME.primary,
        icon: (
          <HiOutlineExternalLink
            className="w-4 h-4"
            style={{ color: UZME.primary }}
          />
        ),
      };
    case "click":
      return {
        kind: "CLICK",
        summary: step.selector,
        tint: `${UZME.tertiary}15`,
        color: UZME.tertiary,
        icon: (
          <HiOutlineCursorClick
            className="w-4 h-4"
            style={{ color: UZME.tertiary }}
          />
        ),
      };
    case "type":
      return {
        kind: "TYPE",
        summary: `${step.selector} → "${step.text}"`,
        tint: `${UZME.tertiary}15`,
        color: UZME.tertiary,
        icon: null,
      };
    case "select":
      return {
        kind: "SELECT",
        summary: `${step.selector} → "${step.value}"`,
        tint: `${UZME.tertiary}15`,
        color: UZME.tertiary,
        icon: null,
      };
    case "hover":
      return {
        kind: "HOVER",
        summary: step.selector,
        tint: `${UZME.tertiary}15`,
        color: UZME.tertiary,
        icon: null,
      };
    case "scroll":
      return {
        kind: "SCROLL",
        summary: `${step.selector || "window"} → ${step.to}px`,
        tint: `${UZME.accent}15`,
        color: UZME.accent,
        icon: null,
      };
    case "wait":
      return {
        kind: "WAIT",
        summary: `dwell ${step.dwellMs}ms`,
        tint: "rgba(255,255,255,0.06)",
        color: "var(--text-muted)" as string,
        icon: null,
      };
    case "overlay":
      return {
        kind: "OVERLAY",
        summary: `"${step.text}" (${step.position || "bottom"})`,
        tint: `${UZME.warning}25`,
        color: UZME.warning,
        icon: (
          <HiOutlineSparkles
            className="w-4 h-4"
            style={{ color: UZME.warning }}
          />
        ),
      };
    case "keypress":
      return {
        kind: "KEY",
        summary: step.key,
        tint: `${UZME.accent}15`,
        color: UZME.accent,
        icon: (
          <HiOutlineEye
            className="w-4 h-4"
            style={{ color: UZME.accent }}
          />
        ),
      };
  }
}
