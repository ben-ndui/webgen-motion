"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronRight,
  FileText,
  Film,
  HelpCircle,
  Loader2,
  Mic,
  Music,
  Save,
  Video,
} from "lucide-react";
import type { TourEntry } from "@/lib/types/tour";
import TabsStrip, { type TabDef } from "./_components/tabs-strip";
import ScriptTab, { type SaveStatus } from "./_components/script-tab";
import CaptureTab, {
  type CaptureState,
  type CapturedSection,
} from "./_components/capture-tab";
import AudioTab from "./_components/audio-tab";
import VoiceTab, { type VoState } from "./_components/voice-tab";
import ComposeTab, { type ComposeState } from "./_components/compose-tab";
import type { AudioTrack } from "./_components/music-library";
import type { RunningProgress } from "./_components/phase-loader";

type TabKey = "script" | "capture" | "audio" | "voice" | "compose";

/**
 * Tour preview client — orchestrator. Holds all per-tour state in
 * one place, hands slices to each tab. Tabs are state-based (not
 * route-based) — matches WebGen's create-tab pattern.
 *
 * Sprint 2 chunk 1 ships Script tab fully. Capture / Audio / Voice /
 * Compose tabs are placeholders pending the next chunk.
 */
export default function TourClient({ tour }: { tour: TourEntry }) {
  const [activeTab, setActiveTab] = useState<TabKey>("script");

  // ── Persisted state (localStorage) ───────────────────────────────
  // Tour itself is now the source of truth — voOverrides legacy system
  // dropped now that ScriptTab edits the tour directly + saves to disk.
  const formatKey = `motion-format:${tour.id}`;
  const [localTour, setLocalTour] = useState<TourEntry>(tour);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [captureFormat, setCaptureFormatState] = useState<"16:9" | "9:16">(
    tour.format ?? "16:9",
  );
  const [capture, setCapture] = useState<CaptureState>({ kind: "idle" });
  const [vo, setVo] = useState<VoState>({ kind: "idle" });
  const [compose, setCompose] = useState<ComposeState>({ kind: "idle" });
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  // bgMusicId : undefined = use catalogue default, "" = explicit no-music,
  // "<id>" = library track override. localStorage'd so the choice survives
  // reloads (fixes silent music drop after refresh).
  const bgMusicKey = `motion-bg-music:${tour.id}`;
  const volumesKey = `motion-volumes:${tour.id}`;
  const [bgMusicId, setBgMusicIdState] = useState<string | undefined>(undefined);
  const [bgMusicVolume, setBgMusicVolumeState] = useState<number>(0.18);
  const [voVolume, setVoVolumeState] = useState<number>(1.0);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const voTickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const composeTickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
      if (voTickerRef.current) clearInterval(voTickerRef.current);
      if (composeTickerRef.current) clearInterval(composeTickerRef.current);
    };
  }, []);

  const setBgMusicId = (next: string | undefined) => {
    setBgMusicIdState(next);
    try {
      if (next === undefined) localStorage.removeItem(bgMusicKey);
      else localStorage.setItem(bgMusicKey, next);
    } catch {}
  };

  const saveVolumes = (bg: number, voV: number) => {
    setBgMusicVolumeState(bg);
    setVoVolumeState(voV);
    try {
      localStorage.setItem(volumesKey, JSON.stringify({ bg, vo: voV }));
    } catch {}
  };

  const refreshTracks = async () => {
    try {
      const res = await fetch("/api/motion/audio");
      if (!res.ok) return;
      const data = await res.json();
      setTracks(data.tracks ?? []);
    } catch {}
  };

  useEffect(() => {
    refreshTracks();
  }, []);

  useEffect(() => {
    try {
      const f = localStorage.getItem(formatKey);
      if (f === "9:16" || f === "16:9") setCaptureFormatState(f);
      const bg = localStorage.getItem(bgMusicKey);
      if (bg !== null) setBgMusicIdState(bg);
      const vraw = localStorage.getItem(volumesKey);
      if (vraw) {
        const v = JSON.parse(vraw) as { bg?: number; vo?: number };
        if (typeof v.bg === "number") setBgMusicVolumeState(v.bg);
        if (typeof v.vo === "number") setVoVolumeState(v.vo);
      }
    } catch {
      // Ignore storage errors (private mode, quota, etc.)
    }
  }, [formatKey, bgMusicKey, volumesKey]);

  // Auto-load existing artifacts from disk so a returning session
  // doesn't have to re-run Capturer. /api/motion/tour/status returns
  // hasManifest / hasVoiceover / hasFinal + section URLs cache-busted
  // by file mtime.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/motion/tour/status?id=${encodeURIComponent(tour.id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (data.hasManifest && data.manifest) {
          interface StatusSection extends CapturedSection {
            mp4Url: string;
          }
          const sections: CapturedSection[] = (
            data.manifest.sections as StatusSection[]
          ).map((s) => ({ ...s }));
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

  // ── Capture handler — POST + NDJSON streaming ───────────────────
  const handleCapture = async () => {
    if (tickerRef.current) clearInterval(tickerRef.current);
    const startedAt = Date.now();
    setCapture({
      kind: "running",
      progress: { phase: "Lancement…", sinceSec: 0 },
    });
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
        const err = await res
          .json()
          .catch(() => ({ error: `HTTP ${res.status}` }));
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
          setCapture((prev) =>
            prev.kind === "running"
              ? {
                  kind: "running",
                  progress: {
                    ...prev.progress,
                    phase: `Section ${evt.index}/${evt.total} · ${evt.category} · ${evt.title}`,
                    sectionIdx: Number(evt.index),
                    totalSections: Number(evt.total),
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
                  progress: {
                    ...prev.progress,
                    lastWarn: String(evt.message ?? ""),
                  },
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

  // ── Compose handler — POST + NDJSON streaming ───────────────────
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
        const err = await res
          .json()
          .catch(() => ({ error: `HTTP ${res.status}` }));
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

  // ── Voice handler — POST + NDJSON streaming ─────────────────────
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
        body: JSON.stringify({ tourId: tour.id }),
      });
      if (!res.ok || !res.body) {
        const err = await res
          .json()
          .catch(() => ({ error: `HTTP ${res.status}` }));
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
                  progress: {
                    ...prev.progress,
                    lastWarn: String(evt.message ?? ""),
                  },
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
          setVo({
            kind: "error",
            message: String(evt.message ?? "Erreur inconnue"),
          });
        }
      });
    } catch (e) {
      if (voTickerRef.current) clearInterval(voTickerRef.current);
      setVo({
        kind: "error",
        message: e instanceof Error ? e.message : "Network error",
      });
    }
  };

  /**
   * Reads an NDJSON stream and dispatches each parsed object to the
   * provided handler. Reusable across capture / compose / voice.
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
          handle(JSON.parse(line) as Record<string, unknown>);
        } catch {
          /* malformed line */
        }
      }
    }
    if (buf) {
      try {
        handle(JSON.parse(buf) as Record<string, unknown>);
      } catch {}
    }
  }

  const handleTourChange = (next: TourEntry) => {
    setLocalTour(next);
    if (saveStatus === "saved") setSaveStatus("idle"); // mark dirty
  };

  const saveTour = async () => {
    setSaveStatus("saving");
    setSaveError(null);
    try {
      const res = await fetch(
        `/api/motion/tour/${encodeURIComponent(tour.id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tour: localTour }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setSaveStatus("error");
        setSaveError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setSaveStatus("saved");
    } catch (e) {
      setSaveStatus("error");
      setSaveError(e instanceof Error ? e.message : "Network error");
    }
  };

  const setCaptureFormat = (f: "16:9" | "9:16") => {
    setCaptureFormatState(f);
    try {
      localStorage.setItem(formatKey, f);
    } catch {}
  };

  // (voOverrides system retired — ScriptTab now mutates the tour
  //  directly via handleTourChange.)

  // ── Tabs definition ──────────────────────────────────────────────
  const captureBadge =
    capture.kind === "ready" ? capture.sections.length : null;
  const audioBadge = bgMusicId && bgMusicId !== "" ? "•" : null;
  const voiceBadge = vo.kind === "ready" ? "•" : null;
  const composeBadge = compose.kind === "ready" ? "•" : null;
  const TABS: TabDef<TabKey>[] = [
    { id: "script", label: "Script", icon: FileText },
    { id: "capture", label: "Capture", icon: Video, badge: captureBadge },
    { id: "audio", label: "Audio", icon: Music, badge: audioBadge },
    { id: "voice", label: "Voix off", icon: Mic, badge: voiceBadge },
    { id: "compose", label: "Compose", icon: Film, badge: composeBadge },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Sticky top bar — same as hub */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/"
                className="shrink-0 flex items-center gap-2 group"
              >
                <span className="w-7 h-7 rounded-lg bg-zinc-900 text-white grid place-items-center group-hover:bg-zinc-800 transition-colors">
                  <Film className="w-3.5 h-3.5" strokeWidth={2.5} />
                </span>
                <span className="font-semibold text-sm tracking-tight">
                  webgen-motion
                </span>
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <Link
                href="/dashboard"
                className="text-sm text-slate-500 font-medium hover:text-slate-900 transition-colors"
              >
                Tours
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span
                className="text-sm text-slate-900 font-medium truncate"
                title={tour.description}
              >
                {tour.name}
              </span>
              <span className="hidden md:inline text-[10px] font-mono text-slate-400 truncate">
                {tour.id}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <SaveButton
                status={saveStatus}
                error={saveError}
                onSave={saveTour}
              />
              <Link
                href="/help"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Aide
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Retour
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 lg:px-8 py-6 space-y-5">
        <TabsStrip<TabKey>
          tabs={TABS}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {/* Tab panes */}
        {activeTab === "script" && (
          <ScriptTab
            tour={localTour}
            onChange={handleTourChange}
            captureFormat={captureFormat}
            onFormatChange={setCaptureFormat}
          />
        )}

        {activeTab === "capture" && (
          <CaptureTab
            capture={capture}
            captureFormat={captureFormat}
            tourId={tour.id}
            onCapture={handleCapture}
          />
        )}

        {activeTab === "audio" && (
          <AudioTab
            tracks={tracks}
            bgMusicId={bgMusicId}
            onBgMusicChange={setBgMusicId}
            onTracksChanged={refreshTracks}
            tourBgMusic={tour.bgMusic}
            bgMusicVolume={bgMusicVolume}
            voVolume={voVolume}
            onVolumesChange={saveVolumes}
          />
        )}

        {activeTab === "voice" && (
          <VoiceTab
            tour={localTour}
            voState={vo}
            onGenerateVo={handleGenerateVo}
            onJumpToScript={() => setActiveTab("script")}
            onTourChange={handleTourChange}
            onSaveTour={saveTour}
            saveStatus={saveStatus}
          />
        )}

        {activeTab === "compose" && (
          <ComposeTab
            tourId={tour.id}
            tour={localTour}
            onTourChange={handleTourChange}
            compose={compose}
            captureSections={
              capture.kind === "ready" ? capture.sections : null
            }
            voState={vo}
            bgMusicId={bgMusicId}
            tracks={tracks}
            bgMusicVolume={bgMusicVolume}
            voVolume={voVolume}
            onCompose={handleCompose}
          />
        )}
      </main>
    </div>
  );
}

/**
 * Always-visible save affordance for the tour. Lives in the top bar
 * so any tab (Script, Capture, Audio, Voice, Compose) can persist
 * pending tour changes without going back to Script to find the
 * button. Renders 4 visual states keyed on saveStatus :
 *   - idle       → black filled button "Sauvegarder"
 *   - saving     → animated spinner, disabled
 *   - saved      → green check pill (read-only, fades into idle on
 *                  the next dirty edit via the parent's state)
 *   - error      → rose pill that opens a tiny tooltip with the
 *                  error message
 */
function SaveButton({
  status,
  error,
  onSave,
}: {
  status: SaveStatus;
  error: string | null;
  onSave: () => void;
}) {
  if (status === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Sauvegarde…
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium">
        <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
        Sauvegardé
      </span>
    );
  }
  if (status === "error") {
    return (
      <button
        onClick={onSave}
        title={error ?? "Erreur de sauvegarde"}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-medium transition-colors"
      >
        <AlertCircle className="w-3.5 h-3.5" />
        Réessayer
      </button>
    );
  }
  return (
    <button
      onClick={onSave}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-medium transition-colors"
      title="Sauvegarder les modifs du tour"
    >
      <Save className="w-3.5 h-3.5" />
      Sauvegarder
    </button>
  );
}
