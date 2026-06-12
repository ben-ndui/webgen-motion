"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { TourEntry } from "@/lib/types/tour";
import type { TakeBlock } from "./types";
import { fmtHHMM } from "./StepDiffBlock";

type HubActionB = Extract<TakeBlock, { kind: "hub-action" }>;

/** Résumé d'un TourEntry proposé — sections + durée estimée. */
function tourSummary(tour: TourEntry): { sections: number; durSec: number } {
  const sections = tour.steps.filter((s) => s.type === "section").length;
  return { sections, durSec: Math.round(tour.estimatedSec ?? 0) };
}

/**
 * Bloc hub-action — l'agent du studio propose de créer ou d'ouvrir un
 * tour. Card dashed (proposée) → solid (faite), même langage que les
 * step-diffs de l'éditeur. JAMAIS d'action sans clic de confirmation :
 * « Créer le tour » / « Ouvrir » sont les seuls déclencheurs.
 */
export default function HubActionBlock({
  block,
  doneAt,
  disabled,
  onConfirm,
  onDiscard,
  onOpen,
}: {
  block: HubActionB;
  doneAt?: string;
  disabled: boolean;
  onConfirm: () => void;
  onDiscard: () => void;
  /** Ouvrir le tour d'un create-tour déjà créé. */
  onOpen: (tourId: string) => void;
}) {
  const reduced = useReducedMotion();
  const action = block.action;
  const done = block.state === "done";
  const isCreate = action.type === "create-tour";

  if (block.state === "discarded") {
    return (
      <div className="take-log">
        <span className="lp" data-p="note">note</span>
        <span className="lt">proposition écartée</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      <div className="take-card-row">
        <span className="lp" data-p={isCreate ? "step+" : "run"}>
          {isCreate ? "tour+" : "open"}
        </span>
        <motion.div
          className={"take-card" + (done ? " applied" : "")}
          animate={done && !reduced ? { scale: [1, 0.99, 1] } : { scale: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <div className="tc-head">
            <span className="hub-badge">{isCreate ? "TOUR" : "OUVRIR"}</span>
            <span className="tc-title">
              {action.type === "create-tour" ? action.tour.name : action.title}
            </span>
          </div>
          {action.type === "create-tour" ? (
            <>
              <div className="dl dl-add">
                <span className="sign">+</span>
                <span className="dl-t">
                  id &quot;{action.tour.id}&quot; · {action.tour.format ?? "16:9"} ·{" "}
                  {action.tour.platform ?? "web"}
                </span>
              </div>
              <div className="dl dl-add">
                <span className="sign">+</span>
                <span className="dl-t">
                  {tourSummary(action.tour).sections} section
                  {tourSummary(action.tour).sections > 1 ? "s" : ""} ·{" "}
                  {action.tour.steps.length} steps · ~{tourSummary(action.tour).durSec}s
                </span>
              </div>
              {action.tour.baseUrl && (
                <div className="dl dl-add">
                  <span className="sign">+</span>
                  <span className="dl-t">baseUrl {action.tour.baseUrl}</span>
                </div>
              )}
            </>
          ) : (
            <div className="dl">
              <span className="sign"> </span>
              <span className="dl-t">id &quot;{action.tourId}&quot;</span>
            </div>
          )}
        </motion.div>
      </div>

      {block.state === "proposed" && (
        <div className="take-actions">
          <button
            type="button"
            className="con-btn ghost"
            onClick={onDiscard}
            disabled={disabled}
            data-wm-id="console.hub.discard"
          >
            Écarter
          </button>
          <button
            type="button"
            className="con-btn primary"
            onClick={onConfirm}
            disabled={disabled}
            data-wm-id={isCreate ? "console.hub.create" : "console.hub.open"}
          >
            {isCreate ? "Créer le tour" : "Ouvrir"}
          </button>
        </div>
      )}

      {done && (
        <div className="take-actions">
          <motion.span
            className="take-stamp run-done"
            initial={reduced ? false : { scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: reduced ? 0 : 0.35, type: "spring", stiffness: 420, damping: 26 }}
          >
            {isCreate ? "Créé" : "Ouvert"}
            {doneAt ? ` · ${fmtHHMM(doneAt)}` : ""}
          </motion.span>
          {action.type === "create-tour" && (
            <button
              type="button"
              className="con-link"
              onClick={() => onOpen(action.tour.id)}
              data-wm-id="console.hub.open-created"
            >
              ouvrir le tour
            </button>
          )}
        </div>
      )}
    </div>
  );
}
