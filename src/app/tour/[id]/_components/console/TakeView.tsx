"use client";

import type { Take, TakeBlock } from "./types";
import PlanBlock, { LogLines } from "./PlanBlock";
import StepDiffBlock, { fmtHHMM, type AppliedMeta } from "./StepDiffBlock";
import RunLogBlock from "./RunLogBlock";
import ErrorBlock from "./ErrorBlock";

/** Issue affichée à droite d'une prise compactée. */
function compactIssue(take: Take): { label: string; cls: string } {
  switch (take.status) {
    case "applied":
      return { label: `appliqué · v${take.appliedVersion ?? "?"}`, cls: "applied" };
    case "done":
      return { label: `terminé ${fmtHHMM(take.at)}`, cls: "done" };
    case "discarded":
      return { label: "écarté", cls: "muted" };
    case "cancelled":
      return { label: "interrompu", cls: "muted" };
    case "error":
      return { label: "erreur", cls: "error" };
    default:
      return { label: "proposé", cls: "muted" };
  }
}

/**
 * Une prise — la ligne de commande figée (#NN ❯ prompt + chip scope)
 * puis les blocs streamés. Compactée en une ligne uni-issue dans les
 * sessions longues (dépliable in place).
 */
export default function TakeView({
  take,
  compact,
  streaming,
  metaFor,
  sectionTitles,
  sectionEstimates,
  onExpand,
  onApply,
  onDiscard,
  onRestore,
  onRevert,
  onLaunch,
  onLater,
  onCancelRun,
  onRetry,
  onOpenCompose,
  onCancelStreaming,
  onHoverSections,
}: {
  take: Take;
  compact: boolean;
  streaming: boolean;
  metaFor: (blockIdx: number) => AppliedMeta | undefined;
  sectionTitles: string[];
  sectionEstimates: number[];
  onExpand: () => void;
  onApply: (blockIdx: number) => void;
  onDiscard: (blockIdx: number) => void;
  onRestore: (blockIdx: number) => void;
  onRevert: (blockIdx: number) => void;
  onLaunch: (blockIdx: number) => void;
  onLater: (blockIdx: number) => void;
  onCancelRun: () => void;
  onRetry: () => void;
  onOpenCompose: () => void;
  onCancelStreaming: () => void;
  onHoverSections: (ordinals: number[] | null) => void;
}) {
  const num = `#${String(take.n).padStart(2, "0")}`;

  if (compact) {
    const issue = compactIssue(take);
    return (
      <button
        type="button"
        className="take compact"
        onClick={onExpand}
        title="Déplier la prise"
        data-wm-id="console.take.expand"
      >
        <span className="take-n">{num}</span>
        <span className="take-chev">❯</span>
        <span className="tcp">{take.prompt}</span>
        <span className={`tci ${issue.cls}`}>{issue.label}</span>
      </button>
    );
  }

  /** Δ « S2 : 6.5s → 4.9s · 2 steps » — avant/après depuis l'estimation
   *  courante de la section (le tour a déjà muté quand applied). */
  const deltaLabel = (block: Extract<TakeBlock, { kind: "step-diff" }>): string => {
    const o = block.diff.touchedSections[0] ?? 0;
    const est = sectionEstimates[o] ?? 0;
    const applied = block.state === "applied";
    const before = applied ? est - block.diff.deltaSec : est;
    const after = applied ? est : est + block.diff.deltaSec;
    const n = block.diff.ops.length;
    return `S${o + 1} : ${before.toFixed(1)}s → ${after.toFixed(1)}s · ${n} step${n > 1 ? "s" : ""}`;
  };

  const touched = take.blocks.flatMap((b) =>
    b.kind === "step-diff" ? b.diff.touchedSections : [],
  );

  return (
    <div
      className="take"
      onMouseEnter={() => touched.length > 0 && onHoverSections(touched)}
      onMouseLeave={() => touched.length > 0 && onHoverSections(null)}
    >
      <div className="take-head">
        <span className="take-n">{num}</span>
        <span className="take-chev">❯</span>
        {take.scopeSection !== undefined && (
          <span className="take-scope" title={sectionTitles[take.scopeSection]}>
            @S{take.scopeSection + 1}
          </span>
        )}
        <span className="take-cmd">{take.prompt}</span>
      </div>

      <div className="take-body">
        {take.blocks.map((block, bi) => {
          const isLast = bi === take.blocks.length - 1;
          switch (block.kind) {
            case "text":
              return (
                <div key={bi} className="take-text">
                  {block.text}
                </div>
              );
            case "plan":
              return <PlanBlock key={bi} lines={block.lines} caret={streaming && isLast} />;
            case "step-diff": {
              // le vo-diff adjacent s'affiche DANS le step-diff, entre
              // les cards et le Δ (états synchronisés par le dock)
              const next = take.blocks[bi + 1];
              const voAfter = next?.kind === "vo-diff" ? next.after : undefined;
              return (
                <StepDiffBlock
                  key={bi}
                  block={block}
                  meta={metaFor(bi)}
                  deltaLabel={deltaLabel(block)}
                  voAfter={block.state === "discarded" ? undefined : voAfter}
                  disabled={streaming}
                  onApply={() => onApply(bi)}
                  onDiscard={() => onDiscard(bi)}
                  onRestore={() => onRestore(bi)}
                  onRevert={() => onRevert(bi)}
                />
              );
            }
            case "vo-diff": {
              // Affichage seul — déjà rendu dans le step-diff adjacent.
              const prev = take.blocks[bi - 1];
              if (prev?.kind === "step-diff") return null;
              return (
                <LogLines
                  key={bi}
                  lines={[{ prefix: "vo~", text: `« ${block.after} »` }]}
                />
              );
            }
            case "run-log":
              return (
                <RunLogBlock
                  key={bi}
                  block={block}
                  doneAt={metaFor(bi)?.at}
                  streaming={streaming && isLast}
                  onLaunch={() => onLaunch(bi)}
                  onLater={() => onLater(bi)}
                  onCancel={onCancelRun}
                  onOpenCompose={onOpenCompose}
                />
              );
            case "error":
              return <ErrorBlock key={bi} block={block} prompt={take.prompt} onRetry={onRetry} />;
          }
        })}

        {streaming && (
          <div className="take-actions" style={{ justifyContent: "flex-start" }}>
            <button
              type="button"
              className="con-btn ghost"
              onClick={onCancelStreaming}
              data-wm-id="console.take.cancel"
            >
              Échap · annuler
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
