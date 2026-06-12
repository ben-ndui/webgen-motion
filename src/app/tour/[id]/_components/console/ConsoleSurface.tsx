"use client";

/**
 * Director's Console — la surface réutilisable : flux des prises (Z3)
 * + composer (Z4) + empty states (accueil / BYOK sans clé). Extraite
 * de ConsoleDock (étape 1 du chantier hub) — le dock éditeur, le
 * drawer du hub, le flottant et la fenêtre séparée la partagent.
 *
 * La timeline Z2 reste un composant séparé (ConsoleTimeline), affichée
 * par le chrome uniquement quand il y a un tour ouvert.
 */
import type { TourEntry } from "@/lib/types/tour";
import type { ConsoleSession } from "./useConsoleSession";
import TakeView from "./TakeView";
import Composer from "./Composer";
import ConsoleEmpty from "./ConsoleEmpty";
import ConsoleNoKey from "./ConsoleNoKey";

export default function ConsoleSurface({
  session,
  tour,
  onOpenCompose,
}: {
  session: ConsoleSession;
  /** Contexte éditeur — absent en mode hub. */
  tour?: TourEntry;
  onOpenCompose?: () => void;
}) {
  const {
    takes,
    streamingId,
    streaming,
    noKey,
    sections,
    sectionTitles,
    sectionEstimates,
    composerValue,
    setComposerValue,
    composerScope,
    setComposerScope,
    taRef,
    focusComposer,
    flowRef,
    onFlowScroll,
    resumeScroll,
    scrolledUp,
    isCompact,
    compactBoundary,
    expandTake,
    metaFor,
    durationOf,
    handleSend,
    cancelStreaming,
    applyBlock,
    revertBlock,
    discardBlock,
    restoreBlock,
    applyLatest,
    discardLatest,
    launchRun,
    laterRun,
    retryTake,
    confirmHubAction,
    discardHubAction,
    openCreatedTour,
    setHoverOrdinals,
    history,
  } = session;

  return (
    <div className="con-surface">
      {/* Z3 — flux des prises */}
      <div className="con-flow-wrap">
        <div className="con-flow" ref={flowRef} onScroll={onFlowScroll}>
          {noKey ? (
            <ConsoleNoKey />
          ) : takes.length === 0 ? (
            <ConsoleEmpty tour={tour} onPick={(text) => focusComposer(text)} />
          ) : (
            takes.map((take, i) => (
              <div key={take.id} style={{ display: "contents" }}>
                {i === compactBoundary && i > 0 && <hr className="con-compact-rule" />}
                <TakeView
                  take={take}
                  compact={isCompact(i, take)}
                  streaming={take.id === streamingId}
                  metaFor={metaFor(take.id)}
                  sectionTitles={sectionTitles}
                  sectionEstimates={sectionEstimates}
                  onExpand={() => expandTake(take.id)}
                  onApply={(bi) => applyBlock(take.id, bi)}
                  onDiscard={(bi) => discardBlock(take.id, bi)}
                  onRestore={(bi) => restoreBlock(take.id, bi)}
                  onRevert={(bi) => revertBlock(take.id, bi)}
                  onLaunch={(bi) => launchRun(take.id, bi)}
                  onLater={(bi) => laterRun(take.id, bi)}
                  onCancelRun={cancelStreaming}
                  onRetry={() => retryTake(take.id)}
                  onOpenCompose={onOpenCompose ?? (() => {})}
                  onCancelStreaming={cancelStreaming}
                  onHoverSections={setHoverOrdinals}
                  onHubConfirm={(bi) => confirmHubAction(take.id, bi)}
                  onHubDiscard={(bi) => discardHubAction(take.id, bi)}
                  onHubOpen={(tourId) => openCreatedTour(tourId)}
                />
              </div>
            ))
          )}
        </div>
        {scrolledUp && streaming && (
          <button
            type="button"
            className="con-resume"
            onClick={resumeScroll}
            data-wm-id="console.resume"
          >
            ↓ reprendre
          </button>
        )}
      </div>

      {/* Z4 — composer */}
      <Composer
        value={composerValue}
        onValueChange={setComposerValue}
        scope={composerScope}
        onScopeChange={setComposerScope}
        sections={sections}
        durationOf={durationOf}
        disabled={streaming || noKey}
        placeholder={
          noKey
            ? "Configure une clé pour commencer"
            : tour
              ? undefined
              : "Décris un tour à créer…"
        }
        onSend={handleSend}
        history={history}
        taRef={taRef}
        onApplyLatest={applyLatest}
        onDiscardLatest={discardLatest}
      />
    </div>
  );
}
