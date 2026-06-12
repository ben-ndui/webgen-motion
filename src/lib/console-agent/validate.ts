/**
 * Director's Console — validation et enrichissement des ops du modèle.
 *
 * Principe de sûreté : le LLM ne fournit JAMAIS les données de
 * rollback. `before` (replace) et `removed` (remove) sont réécrits
 * depuis le tour réel ; deltaSec, touchedSections et les cards sont
 * recalculés ici, déterministes. Un op invalide (index hors bornes,
 * step malformé, plateforme incohérente) rejette la proposition
 * entière avec un message exploitable — on ne « répare » pas en
 * silence un diff qu'on appliquerait ensuite à l'aveugle.
 */

import type { TourEntry, TourStep } from "@/lib/types/tour";
import type {
  DiffOp,
  StepDiffCard,
  TourDiff,
} from "@/app/tour/[id]/_components/console/types";
import {
  dwellOf,
  sectionOrdinalOfStep,
  sectionsOf,
} from "@/app/tour/[id]/_components/console/sections";
import type { ModelDiffOp } from "./take-schema";

const WEB_STEPS = new Set([
  "section", "goto", "click", "type", "select", "hover", "scroll",
  "wait", "overlay", "keypress",
]);
const MOBILE_STEPS = new Set([
  "section", "wait", "overlay",
  "launchApp", "tapOn", "inputText", "swipe", "back",
]);

/** Champs requis par type — validation structurelle minimale (le
 *  reste est toléré : le schéma TourStep est volontairement souple). */
const REQUIRED_FIELDS: Record<string, string[]> = {
  section: ["categoryId", "title"],
  goto: ["url"],
  click: ["selector"],
  type: ["selector", "text"],
  select: ["selector", "value"],
  hover: ["selector"],
  scroll: ["to"],
  wait: ["dwellMs"],
  overlay: ["text"],
  keypress: ["key"],
  launchApp: [],
  tapOn: [],
  inputText: ["text"],
  swipe: ["direction"],
  back: [],
};

export interface ValidationResult {
  ok: boolean;
  error?: string;
  diff?: TourDiff;
  cards?: StepDiffCard[];
}

function validateStep(
  step: unknown,
  platform: "web" | "ios" | "android",
): string | null {
  if (typeof step !== "object" || step === null) return "step non-objet";
  const s = step as Record<string, unknown>;
  const type = s.type;
  if (typeof type !== "string") return "step sans type";
  const allowed = platform === "web" ? WEB_STEPS : MOBILE_STEPS;
  if (!allowed.has(type)) {
    return `step "${type}" non valide pour un tour ${platform}`;
  }
  for (const f of REQUIRED_FIELDS[type] ?? []) {
    if (s[f] === undefined) return `step "${type}" sans champ requis "${f}"`;
  }
  if (type === "tapOn" && s.text === undefined && s.id === undefined) {
    return `tapOn sans "text" ni "id"`;
  }
  return null;
}

/** Libellé court d'un step pour les lignes de card. */
function stepSummaryFields(s: TourStep): Array<[string, unknown]> {
  const rec = s as unknown as Record<string, unknown>;
  const keys = Object.keys(rec).filter((k) => k !== "type" && k !== "hotspots");
  const out: Array<[string, unknown]> = keys.map((k) => [k, rec[k]]);
  if ("hotspots" in rec && Array.isArray(rec.hotspots)) {
    out.push(["hotspots", `${(rec.hotspots as unknown[]).length} hotspot(s)`]);
  }
  return out;
}

function fmt(v: unknown): string {
  if (typeof v === "string") return `"${v.length > 48 ? v.slice(0, 45) + "…" : v}"`;
  return JSON.stringify(v) ?? "undefined";
}

/** Cards de présentation : replace → lignes −/+ des seuls champs
 *  changés ; insert → lignes + ; remove → lignes −. */
function buildCards(ops: DiffOp[]): StepDiffCard[] {
  return ops.map((op, opIndex) => {
    const lines: StepDiffCard["lines"] = [];
    if (op.op === "replace-step") {
      const before = op.before as unknown as Record<string, unknown>;
      const after = op.after as unknown as Record<string, unknown>;
      const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
      keys.delete("type");
      for (const k of keys) {
        const b = JSON.stringify(before[k]);
        const a = JSON.stringify(after[k]);
        if (b === a) continue;
        if (before[k] !== undefined) lines.push({ sign: "-", text: `"${k}": ${fmt(before[k])}` });
        if (after[k] !== undefined) lines.push({ sign: "+", text: `"${k}": ${fmt(after[k])}` });
      }
      if (lines.length === 0) lines.push({ sign: " ", text: "(aucun changement détecté)" });
    } else if (op.op === "insert-step") {
      for (const [k, v] of stepSummaryFields(op.step)) {
        lines.push({ sign: "+", text: `${k} ${fmt(v)}` });
      }
    } else if (op.op === "remove-step") {
      for (const [k, v] of stepSummaryFields(op.removed)) {
        lines.push({ sign: "-", text: `${k} ${fmt(v)}` });
      }
    }
    return { opIndex, lines };
  });
}

/**
 * Transforme les ops du modèle en TourDiff sûr. Les `at` du modèle se
 * réfèrent au tableau AVANT application (consigne du system prompt) ;
 * applyTourDiff applique séquentiellement, donc on ajuste les index
 * des ops suivantes quand un insert/remove décale le tableau.
 */
export function validateModelOps(
  tour: TourEntry,
  modelOps: ModelDiffOp[],
  scopeSection?: number,
): ValidationResult {
  if (modelOps.length === 0) return { ok: true };
  const platform = tour.platform ?? "web";
  const sections = sectionsOf(tour);

  // Tri stable par index pour rendre l'ajustement de décalage simple
  // et déterministe (le modèle fournit rarement >3 ops).
  const sorted = [...modelOps].sort((a, b) => a.at - b.at);

  const ops: DiffOp[] = [];
  const touched = new Set<number>();
  let shift = 0; // décalage cumulé causé par les ops déjà transformées
  let deltaMs = 0;

  for (const m of sorted) {
    const at = m.at + shift;
    if (m.op === "insert-step") {
      if (!m.step) return { ok: false, error: "insert-step sans step" };
      const err = validateStep(m.step, platform);
      if (err) return { ok: false, error: err };
      if (at < 0 || at > tour.steps.length + shift) {
        return { ok: false, error: `insert-step index ${m.at} hors bornes` };
      }
      ops.push({ op: "insert-step", at, step: m.step });
      deltaMs += dwellOf(m.step);
      touched.add(sectionOrdinalOfStep(sections, Math.max(0, m.at - 1)));
      shift += 1;
    } else if (m.op === "remove-step") {
      const real = tour.steps[m.at];
      if (!real) return { ok: false, error: `remove-step index ${m.at} hors bornes` };
      ops.push({ op: "remove-step", at, removed: real });
      deltaMs -= dwellOf(real);
      touched.add(sectionOrdinalOfStep(sections, m.at));
      shift -= 1;
    } else {
      const real = tour.steps[m.at];
      if (!real) return { ok: false, error: `replace-step index ${m.at} hors bornes` };
      if (!m.after) return { ok: false, error: "replace-step sans after" };
      const err = validateStep(m.after, platform);
      if (err) return { ok: false, error: err };
      if ((m.after as TourStep).type !== real.type) {
        return {
          ok: false,
          error: `replace-step ${m.at} change le type (${real.type} → ${(m.after as TourStep).type}) — utilise remove + insert`,
        };
      }
      ops.push({ op: "replace-step", at, before: real, after: m.after });
      deltaMs += dwellOf(m.after) - dwellOf(real);
      touched.add(sectionOrdinalOfStep(sections, m.at));
    }
  }

  touched.delete(-1);
  if (
    scopeSection !== undefined &&
    touched.size > 0 &&
    [...touched].some((t) => t !== scopeSection)
  ) {
    return {
      ok: false,
      error: `la proposition sort du scope @S${scopeSection + 1} (sections touchées : ${[...touched].map((t) => `S${t + 1}`).join(", ")})`,
    };
  }

  const diff: TourDiff = {
    ops,
    deltaSec: Math.round((deltaMs / 1000) * 100) / 100,
    touchedSections: [...touched].sort((a, b) => a - b),
  };
  return { ok: true, diff, cards: buildCards(ops) };
}
