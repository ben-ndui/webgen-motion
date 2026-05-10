"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  Film,
  Mic,
  Music,
  Video,
} from "lucide-react";
import type { TourEntry } from "@/lib/types/tour";
import PageHeader from "./_components/page-header";
import TabsStrip, { type TabDef } from "./_components/tabs-strip";
import ScriptTab from "./_components/script-tab";
import CaptureTab, {
  type CaptureState,
  type CapturedSection,
} from "./_components/capture-tab";
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
  const overridesKey = `motion-vo-overrides:${tour.id}`;
  const formatKey = `motion-format:${tour.id}`;
  const [voOverrides, setVoOverridesState] = useState<Record<string, string>>(
    {},
  );
  const [captureFormat, setCaptureFormatState] = useState<"16:9" | "9:16">(
    tour.format ?? "16:9",
  );
  const [capture, setCapture] = useState<CaptureState>({ kind: "idle" });
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(overridesKey);
      if (raw) setVoOverridesState(JSON.parse(raw));
      const f = localStorage.getItem(formatKey);
      if (f === "9:16" || f === "16:9") setCaptureFormatState(f);
    } catch {
      // Ignore storage errors (private mode, quota, etc.)
    }
  }, [overridesKey, formatKey]);

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

  const saveOverrides = (next: Record<string, string>) => {
    setVoOverridesState(next);
    try {
      localStorage.setItem(overridesKey, JSON.stringify(next));
    } catch {}
  };

  const setCaptureFormat = (f: "16:9" | "9:16") => {
    setCaptureFormatState(f);
    try {
      localStorage.setItem(formatKey, f);
    } catch {}
  };

  const handleVoOverrideChange = (linearIdx: number, text: string) => {
    // Drop empty matches that just equal the catalogue default.
    const step = tour.steps[linearIdx];
    const baseText = (step as { voiceover?: string }).voiceover ?? "";
    const next = { ...voOverrides };
    if (text === baseText) {
      delete next[String(linearIdx)];
    } else {
      next[String(linearIdx)] = text;
    }
    saveOverrides(next);
  };

  // ── Tabs definition ──────────────────────────────────────────────
  const captureBadge =
    capture.kind === "ready" ? capture.sections.length : null;
  const TABS: TabDef<TabKey>[] = [
    { id: "script", label: "Script", icon: FileText },
    { id: "capture", label: "Capture", icon: Video, badge: captureBadge },
    { id: "audio", label: "Audio", icon: Music },
    { id: "voice", label: "Voix off", icon: Mic },
    { id: "compose", label: "Compose", icon: Film },
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
                href="/"
                className="text-sm text-slate-500 font-medium hover:text-slate-900 transition-colors"
              >
                Tours
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className="text-sm text-slate-900 font-medium truncate">
                {tour.id}
              </span>
            </div>
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 lg:px-8 py-8 space-y-6">
        <PageHeader
          eyebrow="Tour"
          title={tour.name}
          description={tour.description}
        />

        <TabsStrip<TabKey>
          tabs={TABS}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {/* Tab panes */}
        {activeTab === "script" && (
          <ScriptTab
            tour={tour}
            captureFormat={captureFormat}
            onFormatChange={setCaptureFormat}
            voOverrides={voOverrides}
            onVoOverrideChange={handleVoOverrideChange}
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
          <PlaceholderTab
            title="Audio"
            description="Music library upload/list/preview + sliders volume musique + voix off."
            comingSoon
          />
        )}

        {activeTab === "voice" && (
          <PlaceholderTab
            title="Voix off"
            description="Bouton Générer la voix off + status ElevenLabs + audio preview du voiceover.mp3."
            comingSoon
          />
        )}

        {activeTab === "compose" && (
          <PlaceholderTab
            title="Compose"
            description="Composer le clip final + lecteur du final.mp4 + download."
            comingSoon
          />
        )}
      </main>
    </div>
  );
}

function PlaceholderTab({
  title,
  description,
  comingSoon,
}: {
  title: string;
  description: string;
  comingSoon?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-8 py-16 text-center">
      <h3 className="text-base font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
        {description}
      </p>
      {comingSoon && (
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-600 mt-4">
          Sprint 2 · chunk suivant
        </p>
      )}
    </div>
  );
}
