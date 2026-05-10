"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  const TABS: TabDef<TabKey>[] = [
    { id: "script", label: "Script", icon: FileText },
    { id: "capture", label: "Capture", icon: Video },
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
          <PlaceholderTab
            title="Capture"
            description="Bouton Capturer en MP4 + state machine + grid des sections capturées avec cat color."
            comingSoon
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
