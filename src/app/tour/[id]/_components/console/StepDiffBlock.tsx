"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { TourStep } from "@/lib/types/tour";
import type { DiffOp, LogPrefix, TakeBlock } from "./types";
import { LogLines } from "./PlanBlock";

type StepDiff = Extract<TakeBlock, { kind: "step-diff" }>;

export interface AppliedMeta {
  version: number;
  at: string;
  revertedAt?: string;
}

function opPrefix(op: DiffOp): LogPrefix {
  if (op.op === "insert-step") return "step+";
  if (op.op === "remove-step") return "step-";
  return "step~";
}
function opStep(op: DiffOp): TourStep | null {
  if (op.op === "insert-step") return op.step;
  if (op.op === "remove-step") return op.removed;
  if (op.op === "replace-step") return op.after;
  return null;
}
function cardTitle(step: TourStep | null): string {
  if (!step) return "champ du tour";
  switch (step.type) {
    case "section":
      return step.title;
    case "wait":
      return "dwell";
    case "overlay":
      return `"${step.text}"`;
    case "scroll":
      return `→ ${step.to}px`;
    default:
      return step.type;
  }
}
export function fmtHHMM(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Bloc step-diff — cards fantômes (dashed --accent-line) qui se
 * solidifient à l'Apply : bordure dashed→solid, fond → --surface,
 * léger scale 1 → .99 → 1, écho clone qui part vers l'éditeur, puis
 * estampille `APPLIQUÉ · VN · HH:MM` + lien `défaire`.
 * Sous prefers-reduced-motion : bascule d'états sans clone ni tick.
 */
export default function StepDiffBlock({
  block,
  meta,
  deltaLabel,
  voAfter,
  disabled,
  onApply,
  onDiscard,
  onRestore,
  onRevert,
}: {
  block: StepDiff;
  meta?: AppliedMeta;
  deltaLabel: string;
  /** Bloc vo-diff adjacent — affiché entre les cards et le Δ
   *  (la mutation VO voyage déjà dans le diff, op replace-step). */
  voAfter?: string;
  disabled: boolean;
  onApply: () => void;
  onDiscard: () => void;
  onRestore: () => void;
  onRevert: () => void;
}) {
  const reduced = useReducedMotion();
  const prev = useRef(block.state);
  const [echo, setEcho] = useState(false);
  // cards appliquées contractées par défaut — dépliables au clic
  const [openCards, setOpenCards] = useState<ReadonlySet<number>>(new Set());

  useEffect(() => {
    const was = prev.current;
    prev.current = block.state;
    if (was === "proposed" && block.state === "applied" && !reduced) {
      setEcho(true);
      const t = setTimeout(() => setEcho(false), 280);
      return () => clearTimeout(t);
    }
  }, [block.state, reduced]);

  if (block.state === "discarded") {
    return (
      <button
        type="button"
        className="take-log"
        style={{ background: "none", border: 0, cursor: "pointer", textAlign: "left", padding: 0, width: "100%" }}
        onClick={onRestore}
        title="Récupérer la proposition"
        data-wm-id="console.diff.restore"
      >
        <span className="lp" data-p="note">note</span>
        <span className="lt">proposition écartée — cliquer pour récupérer</span>
      </button>
    );
  }

  const applied = block.state === "applied";
  const justApplied = applied && echo;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {block.cards.map((card, ci) => {
        const op = block.diff.ops[card.opIndex];
        const step = opStep(op);
        const collapsed = applied && !openCards.has(ci);
        const lines = collapsed ? card.lines.slice(0, 1) : card.lines;
        return (
          <div className="take-card-row" key={ci}>
            <span className="lp" data-p={opPrefix(op)}>
              {opPrefix(op) === "step-" ? "step−" : opPrefix(op)}
            </span>
            <motion.div
              className={"take-card" + (applied ? " applied" : "")}
              animate={justApplied && !reduced ? { scale: [1, 0.99, 1] } : { scale: 1 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              onClick={() => {
                if (!applied) return;
                setOpenCards((cur) => {
                  const next = new Set(cur);
                  if (next.has(ci)) next.delete(ci);
                  else next.add(ci);
                  return next;
                });
              }}
              title={applied ? "Cliquer pour déplier le détail" : undefined}
            >
              <div className="tc-head">
                {step && (
                  <span className={`type-badge type-${step.type}`}>{step.type.toUpperCase()}</span>
                )}
                <span className="tc-title">{cardTitle(step)}</span>
              </div>
              {lines.map((l, li) => (
                <div
                  key={li}
                  className={
                    "dl" + (l.sign === "+" ? " dl-add" : l.sign === "-" ? " dl-del" : "")
                  }
                >
                  <span className="sign">{l.sign === "-" ? "−" : l.sign}</span>
                  <span className="dl-t">{l.text}</span>
                </div>
              ))}
            </motion.div>
            <AnimatePresence>
              {echo && !reduced && (
                <motion.div
                  className="tc-echo"
                  initial={{ opacity: 1, x: 0 }}
                  animate={{ opacity: 0, x: 16 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                />
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {voAfter !== undefined && (
        <LogLines lines={[{ prefix: "vo~", text: `« ${voAfter} »` }]} />
      )}

      <div className="take-delta">Δ {deltaLabel}</div>

      {block.state === "proposed" && (
        <div className="take-actions">
          <button
            type="button"
            className="con-btn ghost"
            onClick={onDiscard}
            disabled={disabled}
            data-wm-id="console.diff.discard"
          >
            Écarter
          </button>
          <button
            type="button"
            className="con-btn primary"
            onClick={onApply}
            disabled={disabled}
            data-wm-id="console.diff.apply"
          >
            Appliquer
          </button>
        </div>
      )}

      {applied && meta && (
        <div className="take-actions">
          <motion.span
            className="take-stamp"
            initial={reduced ? false : { scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: reduced ? 0 : 0.35, type: "spring", stiffness: 420, damping: 26 }}
          >
            Appliqué · V{meta.version} · {fmtHHMM(meta.at)}
          </motion.span>
          <button type="button" className="con-link" onClick={onRevert} data-wm-id="console.diff.undo">
            défaire
          </button>
        </div>
      )}

      {block.state === "reverted" && meta && (
        <div className="take-actions">
          <span className="take-stamp undone">
            Défait · {meta.revertedAt ? fmtHHMM(meta.revertedAt) : ""}
          </span>
          <button
            type="button"
            className="con-btn primary"
            onClick={onApply}
            disabled={disabled}
            data-wm-id="console.diff.apply"
          >
            Appliquer
          </button>
        </div>
      )}
    </div>
  );
}
