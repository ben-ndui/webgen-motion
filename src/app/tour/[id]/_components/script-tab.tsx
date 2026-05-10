"use client";

import { Monitor, Smartphone } from "lucide-react";
import type { TourEntry, TourStep } from "@/lib/types/tour";
import { getCategory } from "@/lib/motion-categories";

interface Props {
  tour: TourEntry;
  captureFormat: "16:9" | "9:16";
  onFormatChange: (next: "16:9" | "9:16") => void;
  voOverrides: Record<string, string>;
  onVoOverrideChange: (linearIdx: number, text: string) => void;
}

/**
 * Script tab — list of every step with an inline voice-over textarea
 * for the ones that support it (section, overlay, scroll, wait, hover).
 * Format selector chips top-right.
 */
export default function ScriptTab({
  tour,
  captureFormat,
  onFormatChange,
  voOverrides,
  onVoOverrideChange,
}: Props) {
  const totalDwellMs = tour.steps.reduce((acc, s) => {
    if (s.type === "wait") return acc + s.dwellMs;
    if ("dwellMs" in s && s.dwellMs) return acc + s.dwellMs;
    return acc + 1200;
  }, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      {/* Left — step list */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:overflow-y-auto lg:max-h-[calc(100vh-22rem)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Script du tour
          </h2>
          <p className="text-[11px] font-mono text-slate-500">
            {tour.steps.length} steps
          </p>
        </div>
        <ol className="flex flex-col gap-2">
          {tour.steps.map((step, idx) => (
            <StepRow
              key={idx}
              step={step}
              linearIdx={idx}
              voOverrides={voOverrides}
              onVoOverrideChange={onVoOverrideChange}
            />
          ))}
        </ol>
      </div>

      {/* Right — sticky info panel */}
      <aside className="lg:sticky lg:top-6 self-start space-y-4">
        {/* Format selector */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-3">
            Format de capture
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(["16:9", "9:16"] as const).map((f) => {
              const active = captureFormat === f;
              const Icon = f === "9:16" ? Smartphone : Monitor;
              return (
                <button
                  key={f}
                  onClick={() => onFormatChange(f)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium font-mono transition-all ${
                    active
                      ? "bg-zinc-900 text-white shadow-[0_2px_4px_rgba(0,0,0,0.08)]"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {f}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed mt-3">
            {captureFormat === "9:16"
              ? "Mobile viewport 540×960 dpr=2 → MP4 1080×1920 (TikTok / Reels / Stories)."
              : "Desktop viewport 1920×1080 → Mac browser chrome au compose."}
          </p>
        </div>

        {/* Tour stats */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-3">
            Aperçu
          </p>
          <dl className="space-y-2 text-sm">
            <Row label="Durée estimée" value={`~${tour.estimatedSec}s`} mono />
            <Row label="Sections" value={countSections(tour.steps).toString()} mono />
            <Row label="Voix off" value={countVoiceovers(tour.steps).toString()} mono />
            <Row label="Dwell total" value={`${(totalDwellMs / 1000).toFixed(1)}s`} mono />
            <Row label="Origin" value={tour.baseUrl?.replace(/^https?:\/\//, "") ?? "localhost:3000"} />
            <Row label="Start path" value={tour.startPath} mono />
          </dl>
        </div>
      </aside>
    </div>
  );
}

function StepRow({
  step,
  linearIdx,
  voOverrides,
  onVoOverrideChange,
}: {
  step: TourStep;
  linearIdx: number;
  voOverrides: Record<string, string>;
  onVoOverrideChange: (linearIdx: number, text: string) => void;
}) {
  const meta = describeStep(step);
  const baseVo = "voiceover" in step ? step.voiceover : undefined;
  const override = voOverrides[String(linearIdx)];
  const effectiveVo = override !== undefined ? override : (baseVo ?? "");
  const canHaveVo =
    step.type === "section" ||
    step.type === "overlay" ||
    step.type === "scroll" ||
    step.type === "wait" ||
    step.type === "hover";
  const isOverridden = override !== undefined;

  return (
    <li
      className="rounded-xl border border-slate-200 bg-white p-3 flex flex-col gap-2"
      style={{ borderLeftColor: meta.accent, borderLeftWidth: 3 }}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 min-w-[24px]">
          {String(linearIdx).padStart(2, "0")}
        </span>
        <span
          className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded"
          style={{ backgroundColor: `${meta.accent}15`, color: meta.accent }}
        >
          {meta.kind}
        </span>
        <span className="text-xs text-slate-700 truncate flex-1 min-w-0">
          {meta.summary}
        </span>
        {"dwellMs" in step && step.dwellMs && (
          <span className="font-mono text-[10px] text-slate-400">
            {step.dwellMs}ms
          </span>
        )}
        {isOverridden && (
          <span className="font-mono text-[9px] uppercase tracking-wider px-1 py-0.5 rounded bg-amber-100 text-amber-700">
            Override
          </span>
        )}
      </div>
      {canHaveVo && (
        <textarea
          value={effectiveVo}
          placeholder="Voix off de cette étape (vide = silence)…"
          rows={Math.max(1, Math.min(3, Math.ceil(effectiveVo.length / 80) || 1))}
          onChange={(e) => onVoOverrideChange(linearIdx, e.target.value)}
          className="w-full text-xs font-mono italic p-2 rounded-md border border-slate-200 bg-slate-50 resize-y text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1"
        />
      )}
    </li>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd
        className={`text-xs text-slate-900 truncate ${mono ? "font-mono" : "font-medium"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function countSections(steps: TourStep[]): number {
  return steps.filter((s) => s.type === "section").length;
}

function countVoiceovers(steps: TourStep[]): number {
  return steps.filter(
    (s) =>
      "voiceover" in s &&
      s.voiceover !== undefined &&
      s.voiceover.trim().length > 0,
  ).length;
}

function describeStep(step: TourStep): {
  kind: string;
  summary: string;
  accent: string;
} {
  switch (step.type) {
    case "section": {
      const cat = getCategory(step.categoryId);
      return {
        kind: "SECTION",
        summary: step.subtitle ? `${step.title} — ${step.subtitle}` : step.title,
        accent: cat?.bgColor ?? "#0f172a",
      };
    }
    case "goto":
      return { kind: "GOTO", summary: step.url, accent: "#0ea5e9" };
    case "click":
      return { kind: "CLICK", summary: step.selector, accent: "#2563eb" };
    case "type":
      return {
        kind: "TYPE",
        summary: `${step.selector} → "${step.text}"`,
        accent: "#2563eb",
      };
    case "select":
      return {
        kind: "SELECT",
        summary: `${step.selector} → "${step.value}"`,
        accent: "#2563eb",
      };
    case "hover":
      return { kind: "HOVER", summary: step.selector, accent: "#2563eb" };
    case "scroll":
      return {
        kind: "SCROLL",
        summary: `${step.selector || "window"} → ${step.to}px`,
        accent: "#0ea5e9",
      };
    case "wait":
      return {
        kind: "WAIT",
        summary: `${step.dwellMs}ms`,
        accent: "#94a3b8",
      };
    case "overlay":
      return {
        kind: "OVERLAY",
        summary: `"${step.text}" (${step.position || "center"})`,
        accent: "#f59e0b",
      };
    case "keypress":
      return { kind: "KEY", summary: step.key, accent: "#64748b" };
  }
}
