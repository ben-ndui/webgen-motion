"use client";

import "../../../editor.css";
import { useState } from "react";
import { Monitor, Plus, Smartphone, X } from "lucide-react";
import type { TourEntry, TourStep } from "@/lib/types/tour";
import { getCategory, MOTION_CATEGORIES } from "@/lib/motion-categories";
import { formatDuration } from "@/lib/format-duration";

// Re-exported for the few tabs that mirror the save state inline.
export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface Props {
  tour: TourEntry;
  onChange: (next: TourEntry) => void;
  captureFormat: "16:9" | "9:16";
  onFormatChange: (next: "16:9" | "9:16") => void;
}

const TYPE_LABEL: Record<TourStep["type"], string> = {
  section: "Section",
  overlay: "Overlay",
  click: "Click",
  wait: "Wait",
  scroll: "Scroll",
  goto: "Goto",
  type: "Type",
  select: "Select",
  hover: "Hover",
  keypress: "Key",
  // Sprint D — steps mobiles (capture Maestro)
  launchApp: "Launch app",
  tapOn: "Tap",
  inputText: "Input",
  swipe: "Swipe",
  back: "Back",
};
const ADD_TYPES: TourStep["type"][] = ["section", "overlay", "click", "wait", "scroll"];

/**
 * Script tab — handoff layout (Phase 4). Step rows with a drag grip
 * (reorder), type badge, always-visible VO, and per-step advanced fields
 * revealed when the step is selected. Styling in editor.css (.gm-editor).
 * All mutations flow through the parent via onChange.
 */
export default function ScriptTab({
  tour,
  onChange,
  captureFormat,
  onFormatChange,
}: Props) {
  const [sel, setSel] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  const totalDwellMs = tour.steps.reduce((acc, s) => acc + dwellOf(s), 0);
  const words = tour.steps.reduce(
    (a, s) =>
      a +
      ("voiceover" in s && s.voiceover
        ? s.voiceover.split(/\s+/).filter(Boolean).length
        : 0),
    0,
  );

  const updateStep = (idx: number, mut: (s: TourStep) => TourStep) =>
    onChange({ ...tour, steps: tour.steps.map((s, i) => (i === idx ? mut(s) : s)) });
  const deleteStep = (idx: number) =>
    onChange({ ...tour, steps: tour.steps.filter((_, i) => i !== idx) });
  const addStep = (type: TourStep["type"]) => {
    onChange({ ...tour, steps: [...tour.steps, makeFreshStep(type)] });
    setAddOpen(false);
  };
  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const a = [...tour.steps];
    const [m] = a.splice(from, 1);
    a.splice(to, 0, m);
    onChange({ ...tour, steps: a });
  };

  return (
    <div className="gm-editor" data-wm-id="editor.script">
      <div className="panel">
        <div className="panel-head">
          <div>
            <span className="kicker">Onglet 01</span>
            <h2 className="panel-title">Script</h2>
            <p className="panel-sub">
              Décrivez le tour étape par étape. Glissez le grip pour réordonner.
              Chaque step devient une section capturée ; la voix off se cale au mot près.
            </p>
          </div>
        </div>

        <div className="two-col">
          {/* steps */}
          <div className="steps" data-wm-id="editor.script.steps">
            {tour.steps.map((step, idx) => (
              <StepRow
                key={idx}
                step={step}
                idx={idx}
                selected={sel === idx}
                dragging={drag === idx}
                dragover={over === idx && drag !== idx}
                onSelect={() => setSel((cur) => (cur === idx ? null : idx))}
                onUpdate={(mut) => updateStep(idx, mut)}
                onDelete={() => deleteStep(idx)}
                onDragStart={() => setDrag(idx)}
                onDragOver={() => setOver(idx)}
                onDrop={() => {
                  if (drag !== null) reorder(drag, idx);
                  setDrag(null);
                  setOver(null);
                }}
                onDragEnd={() => {
                  setDrag(null);
                  setOver(null);
                }}
              />
            ))}

            <div className="add-wrap">
              <button className="add-step" onClick={() => setAddOpen((o) => !o)} data-wm-id="editor.script.add">
                <Plus /> Ajouter une étape
              </button>
              {addOpen && (
                <div className="add-menu" data-wm-id="editor.script.addmenu">
                  {ADD_TYPES.map((type) => (
                    <button key={type} onClick={() => addStep(type)}>
                      <span className={`type-badge type-${type}`}>{TYPE_LABEL[type]}</span>
                      <span className="am-d">{describeStep(makeFreshStep(type)).summary}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* side */}
          <aside className="side-stack">
            <div className="side-card" data-wm-id="editor.script.summary">
              <h4>Résumé</h4>
              <div className="sum-row"><span className="k">Étapes</span><span className="v">{tour.steps.length}</span></div>
              <div className="sum-row"><span className="k">Durée estimée</span><span className="v">{formatDuration(totalDwellMs / 1000, { precise: true })}</span></div>
              <div className="sum-row"><span className="k">Sections à capturer</span><span className="v">{countSections(tour.steps)}</span></div>
              <div className="sum-row"><span className="k">Mots de VO</span><span className="v">~{words}</span></div>
              <div className="type-legend">
                {ADD_TYPES.map((t) => (
                  <span key={t} className={`type-badge type-${t}`}>{TYPE_LABEL[t]}</span>
                ))}
              </div>
            </div>

            <div className="side-card" data-wm-id="editor.script.format">
              <h4>Format de capture</h4>
              <div className="fmt-grid">
                {(["16:9", "9:16"] as const).map((f) => {
                  const Icon = f === "9:16" ? Smartphone : Monitor;
                  return (
                    <button
                      key={f}
                      className={"fmt-btn" + (captureFormat === f ? " active" : "")}
                      onClick={() => onFormatChange(f)}
                    >
                      <Icon /> {f}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ── Step row ──────────────────────────────────────────────────────
function StepRow({
  step,
  idx,
  selected,
  dragging,
  dragover,
  onSelect,
  onUpdate,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  step: TourStep;
  idx: number;
  selected: boolean;
  dragging: boolean;
  dragover: boolean;
  onSelect: () => void;
  onUpdate: (mut: (s: TourStep) => TourStep) => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragOver: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  const meta = describeStep(step);
  const baseVo = "voiceover" in step ? step.voiceover : undefined;
  const isWait = step.type === "wait";
  const canHaveVo =
    step.type === "section" ||
    step.type === "overlay" ||
    step.type === "scroll" ||
    step.type === "hover";
  const dwell = "dwellMs" in step ? step.dwellMs : undefined;

  return (
    <div
      className={
        "step" +
        (selected ? " sel" : "") +
        (dragging ? " dragging" : "") +
        (dragover ? " dragover" : "")
      }
      data-wm-id="editor.script.step"
      data-tab-step={idx}
      onClick={onSelect}
      draggable
      onDragStart={(e) => {
        if ((e.target as HTMLElement).closest(".vo, textarea, .step-x, input, select")) {
          e.preventDefault();
          return;
        }
        onDragStart();
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      onDragEnd={onDragEnd}
    >
      <div className="step-grip" title="Glisser pour réordonner"><i /><i /><i /></div>
      <span className={`type-badge type-${step.type}`}>{TYPE_LABEL[step.type]}</span>

      <div className="step-main">
        <div className="step-target">{meta.summary}</div>
        {isWait ? (
          <div className="vo-tag">Pause · aucune voix</div>
        ) : canHaveVo ? (
          <div className="vo-row">
            <span className="vo-tag">VO</span>
            <textarea
              className="vo"
              value={baseVo ?? ""}
              placeholder="Texte de la voix off pour cette étape…"
              rows={Math.max(1, Math.min(3, Math.ceil((baseVo?.length ?? 0) / 80) || 1))}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) =>
                onUpdate((s) => ({ ...s, voiceover: e.target.value || undefined } as TourStep))
              }
            />
          </div>
        ) : null}

        {selected && (
          <div className="step-adv" onClick={(e) => e.stopPropagation()}>
            {dwell !== undefined && (
              <Field
                label="Dwell (ms)"
                value={String(dwell)}
                type="number"
                onChange={(v) => {
                  const n = parseInt(v, 10);
                  if (Number.isFinite(n) && n >= 0)
                    onUpdate((s) => ({ ...s, dwellMs: n } as TourStep));
                }}
              />
            )}
            <SectionLikeFields step={step} onUpdate={onUpdate} />
          </div>
        )}
      </div>

      <div className="step-right">
        <span className="step-dur">{dwell !== undefined ? `${dwell}ms` : "—"}</span>
        <button
          className="step-x"
          aria-label="Supprimer"
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(`Supprimer cette étape ${meta.kind} ?`)) onDelete();
          }}
        >
          <X />
        </button>
      </div>
    </div>
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
        <Field label="Titre" value={step.title} onChange={(v) => onUpdate((s) => ({ ...(s as typeof step), title: v }))} />
        <Field label="Sous-titre" value={step.subtitle ?? ""} onChange={(v) => onUpdate((s) => ({ ...(s as typeof step), subtitle: v || undefined }))} />
        <SelectField
          label="Catégorie"
          value={step.categoryId}
          options={Object.values(MOTION_CATEGORIES).map((c) => ({ id: c.id, label: c.label }))}
          onChange={(v) => onUpdate((s) => ({ ...(s as typeof step), categoryId: v }))}
        />
        <Field label="Goto (optionnel)" value={step.goto ?? ""} onChange={(v) => onUpdate((s) => ({ ...(s as typeof step), goto: v || undefined }))} />
      </>
    );
  }
  if (step.type === "overlay") {
    return (
      <>
        <Field label="Texte" value={step.text} onChange={(v) => onUpdate((s) => ({ ...(s as typeof step), text: v }))} />
        <SelectField
          label="Position"
          value={step.position ?? "center"}
          options={[
            { id: "top", label: "top" },
            { id: "center", label: "center" },
            { id: "bottom", label: "bottom" },
          ]}
          onChange={(v) => onUpdate((s) => ({ ...(s as typeof step), position: v as "top" | "center" | "bottom" }))}
        />
      </>
    );
  }
  if (step.type === "scroll") {
    return (
      <>
        <Field label="Cible (px)" value={String(step.to)} type="number" onChange={(v) => { const n = parseInt(v, 10); if (Number.isFinite(n)) onUpdate((s) => ({ ...(s as typeof step), to: n })); }} />
        <Field label="Selector (optionnel)" value={step.selector ?? ""} onChange={(v) => onUpdate((s) => ({ ...(s as typeof step), selector: v || undefined }))} />
      </>
    );
  }
  if (step.type === "click" || step.type === "hover" || step.type === "type" || step.type === "select") {
    return (
      <>
        <Field label="Selector" value={step.selector} onChange={(v) => onUpdate((s) => ({ ...(s as typeof step), selector: v }))} />
        {step.type === "type" && <Field label="Texte" value={step.text} onChange={(v) => onUpdate((s) => ({ ...(s as typeof step), text: v }))} />}
        {step.type === "select" && <Field label="Valeur" value={step.value} onChange={(v) => onUpdate((s) => ({ ...(s as typeof step), value: v }))} />}
      </>
    );
  }
  if (step.type === "goto") {
    return <Field label="URL" value={step.url} onChange={(v) => onUpdate((s) => ({ ...(s as typeof step), url: v }))} />;
  }
  if (step.type === "keypress") {
    return <Field label="Key" value={step.key} onChange={(v) => onUpdate((s) => ({ ...(s as typeof step), key: v }))} />;
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
    <label className="fld">
      <span>{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
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
    <label className="fld">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
    </label>
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
function makeFreshStep(type: TourStep["type"]): TourStep {
  switch (type) {
    case "wait": return { type: "wait", dwellMs: 1500 };
    case "overlay": return { type: "overlay", text: "Nouveau message", position: "center", dwellMs: 2400 };
    case "scroll": return { type: "scroll", to: 600, dwellMs: 1500 };
    case "section": return { type: "section", categoryId: "branding", title: "Nouvelle section", dwellMs: 2200 };
    case "click": return { type: "click", selector: "[data-tour='']", dwellMs: 1500 };
    case "goto": return { type: "goto", url: "/", dwellMs: 1500 };
    case "type": return { type: "type", selector: "[data-tour='']", text: "", dwellMs: 1500 };
    case "select": return { type: "select", selector: "[data-tour='']", value: "", dwellMs: 1500 };
    case "hover": return { type: "hover", selector: "[data-tour='']", dwellMs: 1500 };
    case "keypress": return { type: "keypress", key: "Escape", dwellMs: 800 };
    // Sprint D — steps mobiles
    case "launchApp": return { type: "launchApp", dwellMs: 2000 };
    case "tapOn": return { type: "tapOn", text: "", dwellMs: 1500 };
    case "inputText": return { type: "inputText", text: "", dwellMs: 1500 };
    case "swipe": return { type: "swipe", direction: "up", dwellMs: 1500 };
    case "back": return { type: "back", dwellMs: 1200 };
  }
}
function describeStep(step: TourStep): { kind: string; summary: string } {
  switch (step.type) {
    case "section": return { kind: "SECTION", summary: step.subtitle ? `${step.title} — ${step.subtitle}` : step.title };
    case "goto": return { kind: "GOTO", summary: step.url };
    case "click": return { kind: "CLICK", summary: step.selector };
    case "type": return { kind: "TYPE", summary: `${step.selector} → "${step.text}"` };
    case "select": return { kind: "SELECT", summary: `${step.selector} → "${step.value}"` };
    case "hover": return { kind: "HOVER", summary: step.selector };
    case "scroll": return { kind: "SCROLL", summary: `${step.selector || "window"} → ${step.to}px` };
    case "wait": return { kind: "WAIT", summary: `${step.dwellMs}ms` };
    case "overlay": return { kind: "OVERLAY", summary: `"${step.text}" (${step.position || "center"})` };
    case "keypress": return { kind: "KEY", summary: step.key };
    // Sprint D — steps mobiles
    case "launchApp": return { kind: "LAUNCH", summary: step.clearState ? "clearState" : "app" };
    case "tapOn": return { kind: "TAP", summary: step.text ?? step.id ?? "—" };
    case "inputText": return { kind: "INPUT", summary: `"${step.text}"` };
    case "swipe": return { kind: "SWIPE", summary: step.direction };
    case "back": return { kind: "BACK", summary: "retour" };
  }
}
