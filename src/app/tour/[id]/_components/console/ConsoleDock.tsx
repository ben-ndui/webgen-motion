"use client";

import "../../../../console.css";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { List, Minus, Terminal } from "lucide-react";
import type { TourEntry } from "@/lib/types/tour";
import type {
  ChatTransport,
  Take,
  TakeBlock,
  TakeEvent,
  TourDiff,
} from "./types";
import { applyTourDiff, revertTourDiff } from "./diff";
import { MockTransport, simulateRun } from "./mock-transport";
import { RealTransport } from "./real-transport";
import { sectionsOf } from "./sections";
import ConsoleTimeline, { type DirtyKind } from "./ConsoleTimeline";
import TakeView from "./TakeView";
import Composer from "./Composer";
import ConsoleEmpty from "./ConsoleEmpty";
import ConsoleNoKey from "./ConsoleNoKey";
import type { AppliedMeta } from "./StepDiffBlock";

const OPEN_KEY = "motion-console-open";
const WIDTH_KEY = "motion-console-w";
const MIN_W = 360;
const MAX_W = 560;
const COMPACT_AFTER = 8; // au-delà, les prises anciennes se compactent
const KEEP_EXPANDED = 3; // les N dernières restent dépliées

type StepDiffB = Extract<TakeBlock, { kind: "step-diff" }>;

/** vo-only si chaque op ne change que le champ voiceover. */
function diffDirtyKind(diff: TourDiff): DirtyKind {
  const voOnly =
    diff.ops.length > 0 &&
    diff.ops.every((op) => {
      if (op.op !== "replace-step") return false;
      const a = { ...op.before, voiceover: undefined };
      const b = { ...op.after, voiceover: undefined };
      return JSON.stringify(a) === JSON.stringify(b);
    });
  return voOnly ? "vo" : "capture";
}

/**
 * Director's Console — le dock. Shell additif : enveloppe le <main>
 * de TourClient (children) et pose la 3e colonne (rail 44px replié /
 * panneau 360–560px ouvert, inline ≥1460px, superposé en dessous).
 *
 * Z1 header · Z2 timeline · Z3 flux des prises · Z4 composer.
 * Toutes les mutations du tour passent par applyTourDiff/revertTourDiff
 * (pures) puis le même onTourChange que le tab Script.
 */
export default function ConsoleDock({
  tour,
  onTourChange,
  capturedDurations,
  onOpenCompose,
  transport: transportProp,
  children,
}: {
  tour: TourEntry;
  onTourChange: (next: TourEntry) => void;
  capturedDurations: number[] | null;
  onOpenCompose: () => void;
  transport?: ChatTransport;
  children: ReactNode;
}) {
  // Transport réel par défaut (route locale → Claude BYOK). Escape
  // hatch démo/dev sans clé : localStorage "motion-console-mock" = "1"
  // rebranche le MockTransport (mêmes événements, scénarios scriptés).
  const transport = useMemo(() => {
    if (transportProp) return transportProp;
    const wantMock =
      typeof window !== "undefined" &&
      window.localStorage.getItem("motion-console-mock") === "1";
    return wantMock ? new MockTransport() : new RealTransport();
  }, [transportProp]);

  // ── dock chrome ──────────────────────────────────────────────────
  const [open, setOpen] = useState(false); // replié par défaut
  const [width, setWidth] = useState(420);
  const [resizing, setResizing] = useState(false);
  const [unseen, setUnseen] = useState(false);
  const [probe, setProbe] = useState<{ configured: boolean } | null>(null);

  // ── session ──────────────────────────────────────────────────────
  const [takes, setTakes] = useState<Take[]>([]);
  const [version, setVersion] = useState(0);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [dirty, setDirty] = useState<ReadonlyMap<number, DirtyKind>>(new Map());
  const [appliedMeta, setAppliedMeta] = useState<Record<string, AppliedMeta>>({});
  const [doneAt, setDoneAt] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [forceCompact, setForceCompact] = useState(false);
  const [hoverOrdinals, setHoverOrdinals] = useState<number[] | null>(null);
  const [scrolledUp, setScrolledUp] = useState(false);

  // ── composer ─────────────────────────────────────────────────────
  const [composerValue, setComposerValue] = useState("");
  const [composerScope, setComposerScope] = useState<number | undefined>(undefined);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const flowRef = useRef<HTMLDivElement | null>(null);
  const undoStack = useRef<{ takeId: string; blockIdx: number }[]>([]);
  const redoStack = useRef<{ takeId: string; blockIdx: number }[]>([]);
  // refs synchronisés post-commit — lus uniquement dans les handlers
  const takesRef = useRef(takes);
  const tourRef = useRef(tour);
  useEffect(() => {
    takesRef.current = takes;
  }, [takes]);
  useEffect(() => {
    tourRef.current = tour;
  }, [tour]);

  const sections = useMemo(() => sectionsOf(tour), [tour]);
  const sectionTitles = useMemo(() => sections.map((s) => s.title), [sections]);
  const sectionEstimates = useMemo(() => sections.map((s) => s.estimatedSec), [sections]);

  // hydrate localStorage (post-mount, sur un frame — pas de mismatch SSR)
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try {
        if (localStorage.getItem(OPEN_KEY) === "1") setOpen(true);
        const w = parseInt(localStorage.getItem(WIDTH_KEY) ?? "", 10);
        if (Number.isFinite(w)) setWidth(Math.min(MAX_W, Math.max(MIN_W, w)));
      } catch {}
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    transport.probe().then((p) => setProbe({ configured: p.configured })).catch(() => setProbe({ configured: false }));
  }, [transport]);

  const persistOpen = (next: boolean) => {
    setOpen(next);
    if (next) setUnseen(false);
    try {
      localStorage.setItem(OPEN_KEY, next ? "1" : "0");
    } catch {}
  };

  const focusComposer = useCallback((text?: string) => {
    if (text !== undefined) setComposerValue(text);
    requestAnimationFrame(() => {
      const ta = taRef.current;
      if (!ta) return;
      ta.focus();
      const len = (text ?? ta.value).length;
      ta.setSelectionRange(len, len);
    });
  }, []);

  // ⌘J global — toggle dock (ouvre + focus composer / replie)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        const next = !open;
        persistOpen(next);
        if (next) focusComposer();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, focusComposer]);

  // mode superposé : se replie quand un drag de step démarre dans le Script
  useEffect(() => {
    const onDrag = () => {
      if (open && window.matchMedia("(max-width: 1459.98px)").matches) persistOpen(false);
    };
    window.addEventListener("dragstart", onDrag);
    return () => window.removeEventListener("dragstart", onDrag);
  }, [open]);

  // ── resize (poignée bord gauche, 360–560, persistée) ─────────────
  const onResizeDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setResizing(true);
    const startX = e.clientX;
    const startW = width;
    const onMove = (ev: PointerEvent) => {
      const w = Math.min(MAX_W, Math.max(MIN_W, startW + (startX - ev.clientX)));
      setWidth(w);
    };
    const onUp = (ev: PointerEvent) => {
      setResizing(false);
      const w = Math.min(MAX_W, Math.max(MIN_W, startW + (startX - ev.clientX)));
      try {
        localStorage.setItem(WIDTH_KEY, String(w));
      } catch {}
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // ── flux : auto-scroll + chip reprendre ──────────────────────────
  useEffect(() => {
    const el = flowRef.current;
    if (el && !scrolledUp) el.scrollTop = el.scrollHeight;
  }, [takes, scrolledUp]);

  const onFlowScroll = () => {
    const el = flowRef.current;
    if (!el) return;
    setScrolledUp(el.scrollHeight - el.scrollTop - el.clientHeight > 60);
  };

  // ── reducer d'événements d'une prise (1 event = 1 mutation UI) ───
  const mutateTake = useCallback((id: string, fn: (t: Take) => Take) => {
    setTakes((prev) => prev.map((t) => (t.id === id ? fn(t) : t)));
  }, []);

  const onTakeEvent = useCallback(
    (id: string) => (evt: TakeEvent) => {
      if (!open) setUnseen(true);
      if (evt.type === "done" && evt.status === "done") {
        setDoneAt((prev) => ({ ...prev, [id]: new Date().toISOString() }));
      }
      mutateTake(id, (t) => {
        const blocks = [...t.blocks];
        const last = blocks[blocks.length - 1];
        switch (evt.type) {
          case "log": {
            const line = { prefix: evt.prefix, text: evt.text };
            if (last?.kind === "plan") {
              blocks[blocks.length - 1] = { ...last, lines: [...last.lines, line] };
            } else if (last?.kind === "run-log") {
              blocks[blocks.length - 1] = { ...last, lines: [...last.lines, line] };
            } else {
              blocks.push({ kind: "plan", lines: [line] });
            }
            return { ...t, blocks };
          }
          case "block":
            return { ...t, blocks: [...blocks, evt.block] };
          case "progress": {
            for (let i = blocks.length - 1; i >= 0; i--) {
              const b = blocks[i];
              if (b.kind === "run-log") {
                blocks[i] = { ...b, progress: { pct: evt.pct, label: evt.label } };
                break;
              }
            }
            return { ...t, blocks };
          }
          case "done": {
            if (evt.status === "done") {
              for (let i = blocks.length - 1; i >= 0; i--) {
                const b = blocks[i];
                if (b.kind === "run-log" && b.state === "running") {
                  blocks[i] = { ...b, state: "done", progress: undefined };
                  break;
                }
              }
            }
            return { ...t, status: evt.status, blocks };
          }
        }
      });
    },
    [mutateTake, open],
  );

  const appendNote = (t: Take, text: string): Take => ({
    ...t,
    blocks: [...t.blocks, { kind: "plan", lines: [{ prefix: "note", text }] }],
  });

  // ── envoi d'une prise ────────────────────────────────────────────
  const handleSend = useCallback(async (textOverride?: string) => {
    if (streamingId || !probe?.configured) return;
    let raw = (textOverride ?? composerValue).trim();
    let scope = composerScope;
    // `@Sn` tapé en préfixe texte (suggestions) → scope ordinal
    const m = raw.match(/^@s(\d+)\s+/i);
    if (m) {
      const o = parseInt(m[1], 10) - 1;
      if (o >= 0 && o < sections.length) {
        scope = o;
        raw = raw.slice(m[0].length);
      }
    }
    if (!raw) return;

    const take: Take = {
      id: `take-${Date.now()}-${takesRef.current.length}`,
      n: takesRef.current.length + 1,
      prompt: raw,
      scopeSection: scope,
      at: new Date().toISOString(),
      status: "streaming",
      blocks: [],
    };
    setTakes((prev) => [...prev, take]);
    setHistory((prev) => [...prev, raw]);
    setComposerValue("");
    setComposerScope(undefined);
    setScrolledUp(false);

    const ac = new AbortController();
    abortRef.current = ac;
    setStreamingId(take.id);
    try {
      await transport.send(
        {
          tour: tourRef.current,
          takes: takesRef.current,
          prompt: raw,
          scopeSection: scope,
          pipeline: {
            hasCapture: capturedDurations !== null,
            hasVoiceover: false,
            hasFinal: false,
          },
        },
        { onEvent: onTakeEvent(take.id), signal: ac.signal },
      );
      if (ac.signal.aborted) {
        mutateTake(take.id, (t) =>
          appendNote({ ...t, status: "cancelled" }, "interrompu par le réalisateur"),
        );
      }
    } finally {
      setStreamingId(null);
      abortRef.current = null;
      focusComposer(); // la prise suivante attend — caret prêt
    }
  }, [streamingId, probe, composerValue, composerScope, sections.length, transport, capturedDurations, onTakeEvent, mutateTake, focusComposer]);

  const cancelStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  // Échap pendant le streaming — niveau window : le composer est
  // désactivé pendant une prise, le focus peut être hors du dock
  useEffect(() => {
    if (!streamingId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancelStreaming();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [streamingId, cancelStreaming]);

  // ── apply / revert / discard ─────────────────────────────────────
  const setDiffStates = (
    takeId: string,
    blockIdx: number,
    state: StepDiffB["state"],
    status: Take["status"],
    appliedVersion?: number,
  ) =>
    mutateTake(takeId, (t) => ({
      ...t,
      status,
      ...(appliedVersion !== undefined ? { appliedVersion } : {}),
      blocks: t.blocks.map((b, i) => {
        if (i === blockIdx && b.kind === "step-diff") return { ...b, state };
        // le bloc vo-diff reste de l'affichage — états synchronisés
        if (b.kind === "vo-diff") return { ...b, state };
        return b;
      }),
    }));

  const applyBlock = useCallback(
    (takeId: string, blockIdx: number, viaRedo = false) => {
      const take = takesRef.current.find((t) => t.id === takeId);
      const block = take?.blocks[blockIdx];
      if (!take || !block || block.kind !== "step-diff") return;
      if (block.state !== "proposed" && block.state !== "reverted") return;

      onTourChange(applyTourDiff(tourRef.current, block.diff));
      const v = version + 1;
      setVersion(v);
      setAppliedMeta((prev) => ({
        ...prev,
        [`${takeId}:${blockIdx}`]: { version: v, at: new Date().toISOString() },
      }));
      setDiffStates(takeId, blockIdx, "applied", "applied", v);
      const kind = diffDirtyKind(block.diff);
      setDirty((prev) => {
        const next = new Map(prev);
        for (const o of block.diff.touchedSections) {
          const cur = next.get(o);
          next.set(o, cur === "capture" ? "capture" : kind);
        }
        return next;
      });
      undoStack.current.push({ takeId, blockIdx });
      if (!viaRedo) redoStack.current = [];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onTourChange, version],
  );

  const revertBlock = useCallback(
    (takeId: string, blockIdx: number) => {
      const take = takesRef.current.find((t) => t.id === takeId);
      const block = take?.blocks[blockIdx];
      if (!take || !block || block.kind !== "step-diff" || block.state !== "applied") return;

      onTourChange(revertTourDiff(tourRef.current, block.diff));
      setVersion((cur) => Math.max(0, cur - 1));
      setAppliedMeta((prev) => {
        const key = `${takeId}:${blockIdx}`;
        const cur = prev[key];
        return cur ? { ...prev, [key]: { ...cur, revertedAt: new Date().toISOString() } } : prev;
      });
      setDiffStates(takeId, blockIdx, "reverted", "proposed");
      setDirty((prev) => {
        const next = new Map(prev);
        for (const o of block.diff.touchedSections) next.delete(o);
        return next;
      });
      undoStack.current = undoStack.current.filter(
        (u) => !(u.takeId === takeId && u.blockIdx === blockIdx),
      );
      redoStack.current.push({ takeId, blockIdx });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onTourChange],
  );

  const discardBlock = (takeId: string, blockIdx: number) =>
    setDiffStates(takeId, blockIdx, "discarded", "discarded");
  const restoreBlock = (takeId: string, blockIdx: number) =>
    setDiffStates(takeId, blockIdx, "proposed", "proposed");

  /** Dernier step-diff actionnable (⌘↵ Appliquer / ⌘⌫ Écarter). */
  const latestProposed = (): { takeId: string; blockIdx: number } | null => {
    for (let ti = takesRef.current.length - 1; ti >= 0; ti--) {
      const t = takesRef.current[ti];
      for (let bi = t.blocks.length - 1; bi >= 0; bi--) {
        const b = t.blocks[bi];
        if (b.kind === "step-diff" && (b.state === "proposed" || b.state === "reverted"))
          return { takeId: t.id, blockIdx: bi };
      }
    }
    return null;
  };
  const applyLatest = (): boolean => {
    const hit = latestProposed();
    if (hit) applyBlock(hit.takeId, hit.blockIdx);
    return hit !== null;
  };
  const discardLatest = (): boolean => {
    const hit = latestProposed();
    if (hit) discardBlock(hit.takeId, hit.blockIdx);
    return hit !== null;
  };

  // ── runs proposés (Lancer / Pas encore) — simulation pure ────────
  const launchRun = useCallback(
    async (takeId: string, blockIdx: number) => {
      const take = takesRef.current.find((t) => t.id === takeId);
      const block = take?.blocks[blockIdx];
      if (!take || !block || block.kind !== "run-log" || block.state !== "proposed") return;
      if (streamingId) return;

      mutateTake(takeId, (t) => ({
        ...t,
        status: "streaming",
        blocks: t.blocks.map((b, i) =>
          i === blockIdx && b.kind === "run-log" ? { ...b, state: "running" } : b,
        ),
      }));
      const ac = new AbortController();
      abortRef.current = ac;
      setStreamingId(takeId);
      try {
        await simulateRun(block.job, tourRef.current, onTakeEvent(takeId), ac.signal);
        if (ac.signal.aborted) {
          mutateTake(takeId, (t) =>
            appendNote(
              {
                ...t,
                status: "cancelled",
                blocks: t.blocks.map((b) =>
                  b.kind === "run-log" && b.state === "running"
                    ? { ...b, state: "cancelled", progress: undefined }
                    : b,
                ),
              },
              "interrompu par le réalisateur",
            ),
          );
        }
      } finally {
        setStreamingId(null);
        abortRef.current = null;
        focusComposer();
      }
    },
    [streamingId, mutateTake, onTakeEvent, focusComposer],
  );

  const laterRun = (takeId: string, blockIdx: number) =>
    mutateTake(takeId, (t) =>
      appendNote(
        {
          ...t,
          status: "done",
          blocks: t.blocks.map((b, i) =>
            i === blockIdx && b.kind === "run-log" ? { ...b, state: "cancelled" } : b,
          ),
        },
        "run écarté — relançable via la commande slash",
      ),
    );

  // ── retry d'une prise en erreur (même #NN) ───────────────────────
  const retryTake = useCallback(
    async (takeId: string) => {
      const take = takesRef.current.find((t) => t.id === takeId);
      if (!take || streamingId) return;
      const attempts = take.blocks.filter(
        (b) => b.kind === "plan" && b.lines.some((l) => l.text.startsWith("tentative")),
      ).length;
      mutateTake(takeId, (t) => ({
        ...t,
        status: "streaming",
        blocks: t.blocks.map((b) =>
          b.kind === "error"
            ? {
                kind: "plan" as const,
                lines: [
                  { prefix: "note" as const, text: `tentative ${attempts + 1} échouée (429)` },
                ],
              }
            : b,
        ),
      }));
      const ac = new AbortController();
      abortRef.current = ac;
      setStreamingId(takeId);
      try {
        await transport.send(
          {
            tour: tourRef.current,
            takes: takesRef.current,
            prompt: take.prompt,
            scopeSection: take.scopeSection,
          },
          { onEvent: onTakeEvent(takeId), signal: ac.signal },
        );
        if (ac.signal.aborted) {
          mutateTake(takeId, (t) =>
            appendNote({ ...t, status: "cancelled" }, "interrompu par le réalisateur"),
          );
        }
      } finally {
        setStreamingId(null);
        abortRef.current = null;
        focusComposer();
      }
    },
    [streamingId, transport, mutateTake, onTakeEvent, focusComposer],
  );

  // ── clavier scope console (⌘Z / ⇧⌘Z / Échap streaming) ───────────
  const onDockKeyDown = (e: React.KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey;
    if (e.key === "Escape" && streamingId) {
      e.preventDefault();
      cancelStreaming();
      return;
    }
    if (mod && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) {
        const redo = redoStack.current.pop();
        if (redo) applyBlock(redo.takeId, redo.blockIdx, true);
      } else {
        const undo = undoStack.current[undoStack.current.length - 1];
        if (undo) revertBlock(undo.takeId, undo.blockIdx);
      }
    }
  };

  // ── timeline → composer (hint pré-rempli, jamais d'exécution) ────
  const onTimelineHint = (kind: DirtyKind) => {
    focusComposer(kind === "capture" ? "/capture " : "/vo ");
  };

  const durationOf = useCallback(
    (ordinal: number): string => {
      if (capturedDurations?.[ordinal] !== undefined)
        return `${capturedDurations[ordinal].toFixed(1)}s`;
      const est = sections[ordinal]?.estimatedSec;
      return est !== undefined ? `~${Math.round(est)}s` : "";
    },
    [capturedDurations, sections],
  );

  // ── compaction des prises (session longue) ───────────────────────
  const isCompact = (idx: number, take: Take): boolean => {
    if (take.id === streamingId) return false;
    if (expanded.has(take.id)) return false;
    if (forceCompact) return idx < takes.length - 1;
    return takes.length > COMPACT_AFTER && idx < takes.length - KEEP_EXPANDED;
  };
  const compactBoundary = takes.findIndex((t, i) => !isCompact(i, t));

  const noKey = probe !== null && !probe.configured;
  const streamingTake = streamingId !== null;

  return (
    <div
      className="gm-console-shell"
      data-console={open ? "open" : "rail"}
      style={{ "--console-w": `${width}px` } as React.CSSProperties}
    >
      {children}

      <div className="gm-console-col">
        {/* rail replié 44px */}
        <div
          className="gm-console-rail"
          role="button"
          tabIndex={0}
          title="Ouvrir la console (⌘J)"
          onClick={() => {
            persistOpen(true);
            focusComposer();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              persistOpen(true);
              focusComposer();
            }
          }}
          data-wm-id="console.rail"
        >
          <span className="rail-icon">
            <Terminal />
          </span>
          {unseen && !open && <span className="rail-dot" />}
          <span className="rail-label">console</span>
        </div>

        {open && (
          <section
            className="gm-console gm-editor"
            onKeyDown={onDockKeyDown}
            aria-label="Director's Console"
          >
            <button
              type="button"
              className={"con-resize" + (resizing ? " dragging" : "")}
              onPointerDown={onResizeDown}
              aria-label="Redimensionner la console"
              data-wm-id="console.resize"
            />

            {/* Z1 — header */}
            <div className="con-head">
              <span className={"con-dot" + (streamingTake ? " live" : "")} />
              <span>console</span>
              <span className="ch-id">{tour.id}</span>
              <span className="ch-v">· v{version}</span>
              <span className="ch-actions">
                <button
                  type="button"
                  className={"ch-btn" + (forceCompact ? " on" : "")}
                  title="Historique compact"
                  onClick={() => setForceCompact((v) => !v)}
                  data-wm-id="console.compact-toggle"
                >
                  <List />
                </button>
                <button
                  type="button"
                  className="ch-btn"
                  title="Replier (⌘J)"
                  onClick={() => persistOpen(false)}
                  data-wm-id="console.toggle"
                >
                  <Minus />
                </button>
              </span>
            </div>

            {/* Z2 — timeline ASCII */}
            <ConsoleTimeline
              sections={sections}
              capturedDurations={capturedDurations}
              dirty={dirty}
              scopeOrdinal={composerScope}
              hoverOrdinals={hoverOrdinals}
              onHint={onTimelineHint}
            />

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
                        metaFor={(bi) => appliedMeta[`${take.id}:${bi}`] ?? (doneAt[take.id] ? { version: 0, at: doneAt[take.id] } : undefined)}
                        sectionTitles={sectionTitles}
                        sectionEstimates={sectionEstimates}
                        onExpand={() =>
                          setExpanded((cur) => {
                            const next = new Set(cur);
                            next.add(take.id);
                            return next;
                          })
                        }
                        onApply={(bi) => applyBlock(take.id, bi)}
                        onDiscard={(bi) => discardBlock(take.id, bi)}
                        onRestore={(bi) => restoreBlock(take.id, bi)}
                        onRevert={(bi) => revertBlock(take.id, bi)}
                        onLaunch={(bi) => launchRun(take.id, bi)}
                        onLater={(bi) => laterRun(take.id, bi)}
                        onCancelRun={cancelStreaming}
                        onRetry={() => retryTake(take.id)}
                        onOpenCompose={onOpenCompose}
                        onCancelStreaming={cancelStreaming}
                        onHoverSections={setHoverOrdinals}
                      />
                    </div>
                  ))
                )}
              </div>
              {scrolledUp && streamingTake && (
                <button
                  type="button"
                  className="con-resume"
                  onClick={() => {
                    setScrolledUp(false);
                    const el = flowRef.current;
                    if (el) el.scrollTop = el.scrollHeight;
                  }}
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
              disabled={streamingTake || noKey}
              placeholder={noKey ? "Configure une clé pour commencer" : undefined}
              onSend={handleSend}
              history={history}
              taRef={taRef}
              onApplyLatest={applyLatest}
              onDiscardLatest={discardLatest}
            />
          </section>
        )}
      </div>
    </div>
  );
}

// TODO(/console/new) : le mode création plein écran (§1.4) vivra sur
// une route dédiée — colonne unique 720px, timeline Z2 qui se
// construit segment par segment, CTA « Créer le tour ». Hors scope ici.
