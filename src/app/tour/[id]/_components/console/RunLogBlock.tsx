"use client";

import type { TakeBlock } from "./types";
import { LogLines } from "./PlanBlock";
import { fmtHHMM } from "./StepDiffBlock";

type RunLog = Extract<TakeBlock, { kind: "run-log" }>;

/**
 * Bloc run pipeline — /capture · /vo · /compose. La console est un
 * second abonné du flux : ici le scénario est SIMULÉ (MockTransport),
 * jamais un vrai job. Barre 3px (anatomie .phase-prog), narration
 * Edit Engine en préfixes trim/cut, `[ Lancer ] [ Pas encore ]` quand
 * le run est proposé — jamais d'exécution non confirmée.
 */
export default function RunLogBlock({
  block,
  doneAt,
  streaming,
  onLaunch,
  onLater,
  onCancel,
  onOpenCompose,
}: {
  block: RunLog;
  doneAt?: string;
  streaming: boolean;
  onLaunch: () => void;
  onLater: () => void;
  onCancel: () => void;
  onOpenCompose: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <LogLines lines={block.lines} caret={streaming && block.state === "running" && !block.progress} />

      {block.state === "running" && block.progress && (
        <div style={{ paddingLeft: "calc(5ch + 10px)" }}>
          <div className="run-prog">
            <i style={{ width: `${Math.min(100, Math.max(0, block.progress.pct))}%` }} />
          </div>
          <span className="run-prog-label">{block.progress.label}</span>
        </div>
      )}

      {block.state === "proposed" && (
        <div className="take-actions">
          <button type="button" className="con-btn ghost" onClick={onLater} data-wm-id="console.run.later">
            Pas encore
          </button>
          <button type="button" className="con-btn primary" onClick={onLaunch} data-wm-id="console.run.launch">
            Lancer
          </button>
        </div>
      )}

      {block.state === "running" && (
        <div className="take-actions">
          <button type="button" className="con-btn ghost" onClick={onCancel} data-wm-id="console.run.cancel">
            {block.job === "compose" ? "Annuler le rendu" : "Annuler"}
          </button>
        </div>
      )}

      {block.state === "done" && (
        <div className="take-actions">
          <span className="take-stamp run-done">Terminé{doneAt ? ` · ${fmtHHMM(doneAt)}` : ""}</span>
          {block.job === "compose" && (
            <button type="button" className="con-link" onClick={onOpenCompose} data-wm-id="console.run.open-compose">
              ouvrir le compose
            </button>
          )}
        </div>
      )}
    </div>
  );
}
