"use client";

import { useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Monitor,
  Plus,
  Smartphone,
  Trash2,
} from "lucide-react";
import type { TourEntry, TourStep } from "@/lib/types/tour";
import { getCategory, MOTION_CATEGORIES } from "@/lib/motion-categories";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface Props {
  tour: TourEntry;
  onChange: (next: TourEntry) => void;
  onSave: () => void;
  saveStatus: SaveStatus;
  saveError: string | null;
  captureFormat: "16:9" | "9:16";
  onFormatChange: (next: "16:9" | "9:16") => void;
}

/**
 * Script tab — visual editor (Sprint 4 chunk 2). The tour is held in
 * the parent's local state ; this component reads + mutates it
 * directly via `onChange`. Save is explicit (button) to avoid
 * spamming the disk on every keystroke.
 *
 * Per-step affordances : reorder ↑↓, delete ✕, dwellMs + voiceover
 * inline edit. The bottom action row adds new steps of the most
 * common types (wait / overlay / scroll / section).
 */
export default function ScriptTab({
  tour,
  onChange,
  onSave,
  saveStatus,
  saveError,
  captureFormat,
  onFormatChange,
}: Props) {
  const totalDwellMs = tour.steps.reduce((acc, s) => acc + dwellOf(s), 0);

  const updateStep = (idx: number, mut: (s: TourStep) => TourStep) => {
    const next = tour.steps.map((s, i) => (i === idx ? mut(s) : s));
    onChange({ ...tour, steps: next });
  };
  const deleteStep = (idx: number) => {
    onChange({ ...tour, steps: tour.steps.filter((_, i) => i !== idx) });
  };
  const moveStep = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= tour.steps.length) return;
    const next = [...tour.steps];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange({ ...tour, steps: next });
  };
  const addStep = (type: TourStep["type"]) => {
    const fresh = makeFreshStep(type);
    onChange({ ...tour, steps: [...tour.steps, fresh] });
  };

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
              isFirst={idx === 0}
              isLast={idx === tour.steps.length - 1}
              onUpdate={(mut) => updateStep(idx, mut)}
              onDelete={() => deleteStep(idx)}
              onMove={(dir) => moveStep(idx, dir)}
            />
          ))}
        </ol>
        <AddStepRow onAdd={addStep} />
      </div>

      {/* Right — sticky controls */}
      <aside className="lg:sticky lg:top-6 self-start space-y-4">
        {/* Save card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">
              Édition
            </p>
            <SaveBadge status={saveStatus} />
          </div>
          <button
            onClick={onSave}
            disabled={saveStatus === "saving"}
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saveStatus === "saving" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sauvegarde…
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Sauvegarder
              </>
            )}
          </button>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Écrit dans{" "}
            <code className="font-mono text-slate-700">
              tours/{tour.id}.json
            </code>
            . Les modifs deviennent persistentes.
          </p>
          {saveError && (
            <p className="text-[11px] font-mono text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">
              {saveError}
            </p>
          )}
        </div>

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
        </div>

        {/* Voice override (multi-projets light) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-1">
              Voix off — override par tour
            </p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Laisse vide pour utiliser la config globale (Setup wizard /
              .env). Utile quand plusieurs projets partagent une install mais
              ont chacun leur voix clonée.
            </p>
          </div>
          <div className="space-y-2">
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider font-mono text-slate-500">
                Voice ID
              </span>
              <input
                type="text"
                value={tour.voiceId ?? ""}
                onChange={(e) =>
                  onChange({
                    ...tour,
                    voiceId:
                      e.target.value.trim().length > 0
                        ? e.target.value
                        : undefined,
                  })
                }
                placeholder="ELEVENLABS_VOICE_ID (global)"
                className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider font-mono text-slate-500">
                Model
              </span>
              <input
                type="text"
                value={tour.voiceModel ?? ""}
                onChange={(e) =>
                  onChange({
                    ...tour,
                    voiceModel:
                      e.target.value.trim().length > 0
                        ? e.target.value
                        : undefined,
                  })
                }
                placeholder="eleven_multilingual_v2"
                className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </label>
          </div>

          {/* Voice settings sliders */}
          <div className="pt-2 border-t border-slate-100 space-y-2.5">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">
              Réglages ElevenLabs
            </p>
            <VoiceSlider
              label="Stability"
              hint="Bas = expressif, haut = stable. 0.55 conseillé."
              value={tour.voiceSettings?.stability ?? 0.55}
              onChange={(v) => updateVoiceSettings(tour, onChange, { stability: v })}
            />
            <VoiceSlider
              label="Similarity"
              hint="Fidélité à la voix clonée. 0.78 par défaut."
              value={tour.voiceSettings?.similarityBoost ?? 0.78}
              onChange={(v) =>
                updateVoiceSettings(tour, onChange, { similarityBoost: v })
              }
            />
            <VoiceSlider
              label="Style"
              hint="Coloration émotionnelle. 0.12 conseillé."
              value={tour.voiceSettings?.style ?? 0.12}
              onChange={(v) => updateVoiceSettings(tour, onChange, { style: v })}
            />
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase tracking-wider font-mono text-slate-500 block">
                  Speaker boost
                </span>
                <span className="text-[10px] text-slate-400">
                  Renforce le timbre du speaker
                </span>
              </div>
              <input
                type="checkbox"
                checked={tour.voiceSettings?.useSpeakerBoost ?? true}
                onChange={(e) =>
                  updateVoiceSettings(tour, onChange, {
                    useSpeakerBoost: e.target.checked,
                  })
                }
                className="h-4 w-4 accent-zinc-900"
              />
            </label>
            <button
              onClick={() => onChange({ ...tour, voiceSettings: undefined })}
              className="w-full text-[10px] font-mono uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors py-1"
              title="Reset aux valeurs par défaut"
            >
              ↻ Reset
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-3">
            Aperçu
          </p>
          <dl className="space-y-2 text-sm">
            <Row
              label="Dwell total"
              value={`${(totalDwellMs / 1000).toFixed(1)}s`}
              mono
            />
            <Row
              label="Sections"
              value={countSections(tour.steps).toString()}
              mono
            />
            <Row
              label="Voix off"
              value={countVoiceovers(tour.steps).toString()}
              mono
            />
            <Row
              label="Origin"
              value={tour.baseUrl?.replace(/^https?:\/\//, "") ?? "localhost:3000"}
            />
            <Row label="Start path" value={tour.startPath} mono />
          </dl>
        </div>
      </aside>
    </div>
  );
}

function SaveBadge({ status }: { status: SaveStatus }) {
  if (status === "saving")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-mono uppercase tracking-wider">
        <Loader2 className="w-2.5 h-2.5 animate-spin" />
        Saving
      </span>
    );
  if (status === "saved")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-mono uppercase tracking-wider">
        <Check className="w-2.5 h-2.5" strokeWidth={3} />
        Saved
      </span>
    );
  if (status === "error")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[10px] font-mono uppercase tracking-wider">
        Error
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-mono uppercase tracking-wider">
      Unsaved
    </span>
  );
}

// ── Step row ──────────────────────────────────────────────────────

function StepRow({
  step,
  linearIdx,
  isFirst,
  isLast,
  onUpdate,
  onDelete,
  onMove,
}: {
  step: TourStep;
  linearIdx: number;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (mut: (s: TourStep) => TourStep) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = describeStep(step);
  const baseVo = "voiceover" in step ? step.voiceover : undefined;
  const canHaveVo =
    step.type === "section" ||
    step.type === "overlay" ||
    step.type === "scroll" ||
    step.type === "wait" ||
    step.type === "hover";
  const dwell = "dwellMs" in step ? step.dwellMs : undefined;

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
        {dwell !== undefined && (
          <span className="font-mono text-[10px] text-slate-400">
            {dwell}ms
          </span>
        )}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title={expanded ? "Réduire" : "Détails"}
          aria-label={expanded ? "Réduire" : "Détails"}
        >
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
        <button
          onClick={() => onMove(-1)}
          disabled={isFirst}
          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Monter"
          aria-label="Monter"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onMove(1)}
          disabled={isLast}
          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Descendre"
          aria-label="Descendre"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {
            if (
              window.confirm(
                `Supprimer cette étape ${meta.kind} ?\n${meta.summary.slice(0, 80)}`,
              )
            ) {
              onDelete();
            }
          }}
          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          title="Supprimer"
          aria-label="Supprimer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          {dwell !== undefined && (
            <Field
              label="Dwell (ms)"
              value={String(dwell)}
              type="number"
              onChange={(v) => {
                const n = parseInt(v, 10);
                if (Number.isFinite(n) && n >= 0) {
                  onUpdate((s) => ({ ...s, dwellMs: n } as TourStep));
                }
              }}
            />
          )}
          <SectionLikeFields step={step} onUpdate={onUpdate} />
        </div>
      )}

      {canHaveVo && (
        <textarea
          value={baseVo ?? ""}
          placeholder="Voix off de cette étape (vide = silence)…"
          rows={Math.max(1, Math.min(3, Math.ceil((baseVo?.length ?? 0) / 80) || 1))}
          onChange={(e) =>
            onUpdate(
              (s) => ({ ...s, voiceover: e.target.value || undefined } as TourStep),
            )
          }
          className="w-full text-xs font-mono italic p-2 rounded-md border border-slate-200 bg-slate-50 resize-y text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1"
        />
      )}
    </li>
  );
}

function SectionLikeFields({
  step,
  onUpdate,
}: {
  step: TourStep;
  onUpdate: (mut: (s: TourStep) => TourStep) => void;
}) {
  if (step.type === "section") {
    return (
      <>
        <Field
          label="Titre"
          value={step.title}
          onChange={(v) =>
            onUpdate((s) => ({ ...(s as typeof step), title: v }))
          }
        />
        <Field
          label="Sous-titre"
          value={step.subtitle ?? ""}
          onChange={(v) =>
            onUpdate((s) => ({ ...(s as typeof step), subtitle: v || undefined }))
          }
        />
        <SelectField
          label="Catégorie"
          value={step.categoryId}
          options={Object.values(MOTION_CATEGORIES).map((c) => ({
            id: c.id,
            label: c.label,
          }))}
          onChange={(v) =>
            onUpdate((s) => ({ ...(s as typeof step), categoryId: v }))
          }
        />
        <Field
          label="Goto (optionnel)"
          value={step.goto ?? ""}
          onChange={(v) =>
            onUpdate((s) => ({ ...(s as typeof step), goto: v || undefined }))
          }
        />
      </>
    );
  }
  if (step.type === "overlay") {
    return (
      <>
        <Field
          label="Texte"
          value={step.text}
          onChange={(v) => onUpdate((s) => ({ ...(s as typeof step), text: v }))}
        />
        <SelectField
          label="Position"
          value={step.position ?? "center"}
          options={[
            { id: "top", label: "top" },
            { id: "center", label: "center" },
            { id: "bottom", label: "bottom" },
          ]}
          onChange={(v) =>
            onUpdate((s) => ({
              ...(s as typeof step),
              position: v as "top" | "center" | "bottom",
            }))
          }
        />
      </>
    );
  }
  if (step.type === "scroll") {
    return (
      <>
        <Field
          label="Cible (px)"
          value={String(step.to)}
          type="number"
          onChange={(v) => {
            const n = parseInt(v, 10);
            if (Number.isFinite(n))
              onUpdate((s) => ({ ...(s as typeof step), to: n }));
          }}
        />
        <Field
          label="Selector (optionnel)"
          value={step.selector ?? ""}
          onChange={(v) =>
            onUpdate((s) => ({
              ...(s as typeof step),
              selector: v || undefined,
            }))
          }
        />
      </>
    );
  }
  if (
    step.type === "click" ||
    step.type === "hover" ||
    step.type === "type" ||
    step.type === "select"
  ) {
    return (
      <>
        <Field
          label="Selector"
          value={step.selector}
          onChange={(v) =>
            onUpdate((s) => ({ ...(s as typeof step), selector: v }))
          }
        />
        {step.type === "type" && (
          <Field
            label="Texte"
            value={step.text}
            onChange={(v) => onUpdate((s) => ({ ...(s as typeof step), text: v }))}
          />
        )}
        {step.type === "select" && (
          <Field
            label="Valeur"
            value={step.value}
            onChange={(v) =>
              onUpdate((s) => ({ ...(s as typeof step), value: v }))
            }
          />
        )}
      </>
    );
  }
  if (step.type === "goto") {
    return (
      <Field
        label="URL"
        value={step.url}
        onChange={(v) => onUpdate((s) => ({ ...(s as typeof step), url: v }))}
      />
    );
  }
  if (step.type === "keypress") {
    return (
      <Field
        label="Key"
        value={step.key}
        onChange={(v) => onUpdate((s) => ({ ...(s as typeof step), key: v }))}
      />
    );
  }
  return null;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "number";
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs font-mono px-2 py-1.5 rounded-md border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs font-mono px-2 py-1.5 rounded-md border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// ── Add step row ──────────────────────────────────────────────────

function AddStepRow({ onAdd }: { onAdd: (type: TourStep["type"]) => void }) {
  const types: { id: TourStep["type"]; label: string }[] = [
    { id: "wait", label: "Wait" },
    { id: "overlay", label: "Overlay" },
    { id: "scroll", label: "Scroll" },
    { id: "section", label: "Section" },
    { id: "click", label: "Click" },
    { id: "goto", label: "Goto" },
  ];
  return (
    <div className="mt-4 pt-4 border-t border-slate-200 flex items-center gap-2 flex-wrap">
      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mr-1">
        Ajouter
      </span>
      {types.map((t) => (
        <button
          key={t.id}
          onClick={() => onAdd(t.id)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200 transition-colors"
        >
          <Plus className="w-3 h-3" />
          {t.label}
        </button>
      ))}
    </div>
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

// ── Helpers ───────────────────────────────────────────────────────

function dwellOf(s: TourStep): number {
  if (s.type === "wait") return s.dwellMs;
  if ("dwellMs" in s && s.dwellMs) return s.dwellMs;
  return 1200;
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

function makeFreshStep(type: TourStep["type"]): TourStep {
  switch (type) {
    case "wait":
      return { type: "wait", dwellMs: 1500 };
    case "overlay":
      return {
        type: "overlay",
        text: "Nouveau message",
        position: "center",
        dwellMs: 2400,
      };
    case "scroll":
      return { type: "scroll", to: 600, dwellMs: 1500 };
    case "section":
      return {
        type: "section",
        categoryId: "branding",
        title: "Nouvelle section",
        dwellMs: 2200,
      };
    case "click":
      return { type: "click", selector: "[data-tour='']", dwellMs: 1500 };
    case "goto":
      return { type: "goto", url: "/", dwellMs: 1500 };
    case "type":
      return {
        type: "type",
        selector: "[data-tour='']",
        text: "",
        dwellMs: 1500,
      };
    case "select":
      return {
        type: "select",
        selector: "[data-tour='']",
        value: "",
        dwellMs: 1500,
      };
    case "hover":
      return { type: "hover", selector: "[data-tour='']", dwellMs: 1500 };
    case "keypress":
      return { type: "keypress", key: "Escape", dwellMs: 800 };
  }
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

function updateVoiceSettings(
  tour: TourEntry,
  onChange: (next: TourEntry) => void,
  patch: Partial<NonNullable<TourEntry["voiceSettings"]>>,
): void {
  const next = { ...(tour.voiceSettings ?? {}), ...patch };
  // Drop the field entirely if everything reverts to undefined.
  const allEmpty =
    next.stability === undefined &&
    next.similarityBoost === undefined &&
    next.style === undefined &&
    next.useSpeakerBoost === undefined;
  onChange({ ...tour, voiceSettings: allEmpty ? undefined : next });
}

function VoiceSlider({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-wider font-mono text-slate-500">
          {label}
        </span>
        <span className="text-[10px] font-mono text-slate-700">
          {value.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 mt-1 accent-zinc-900 cursor-pointer"
      />
      <p className="text-[10px] text-slate-400 mt-0.5">{hint}</p>
    </div>
  );
}
