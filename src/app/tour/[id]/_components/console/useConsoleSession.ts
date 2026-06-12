"use client";

/**
 * Director's Console — l'état d'une session de prises, découplé du
 * chrome. Extrait de ConsoleDock (étape 1 du chantier hub) : le dock
 * éditeur, le drawer du hub, la fenêtre flottante et la fenêtre
 * séparée consomment TOUS ce hook — seul le chrome change.
 *
 * Paramétré par : le transport (réel / mock), le contexte tour
 * (optionnel — la console hub n'a pas de tour ouvert) et un jeu
 * d'actions hub (créer / ouvrir un tour, JAMAIS sans confirmation).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TourEntry } from "@/lib/types/tour";
import type {
  ChatTransport,
  RunJob,
  RunParams,
  Take,
  TakeBlock,
  TakeEvent,
  TourDiff,
} from "./types";
import { applyTourDiff, revertTourDiff } from "./diff";
import { simulateRun } from "./mock-transport";
import { sectionsOf } from "./sections";
import type { DirtyKind } from "./ConsoleTimeline";
import type { AppliedMeta } from "./StepDiffBlock";

const COMPACT_AFTER = 8; // au-delà, les prises anciennes se compactent
const KEEP_EXPANDED = 3; // les N dernières restent dépliées
const PERSIST_CAP = 50; // prises max persistées (sessionStorage hub)

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

/** Actions hub branchées par le contexte (dashboard / fenêtre
 *  séparée) — la session ne navigue jamais elle-même. */
export interface HubActionHandlers {
  /** PUT sur la route de création existante du hub. */
  createTour: (tour: TourEntry) => Promise<{ ok: boolean; error?: string }>;
  /** Navigation (router.push / BroadcastChannel selon le contexte). */
  openTour: (tourId: string) => void;
}

export interface ConsoleSessionOptions {
  transport: ChatTransport;
  /** Contexte éditeur — absent en mode hub. */
  tour?: TourEntry;
  onTourChange?: (next: TourEntry) => void;
  capturedDurations?: number[] | null;
  mode?: "editor" | "hub";
  hubActions?: HubActionHandlers;
  /** Notifié à chaque événement reçu (pastille unseen du chrome). */
  onActivity?: () => void;
  /** Clé sessionStorage — persistance best-effort des prises hub
   *  (survit à la bascule drawer ↔ fenêtre séparée). */
  persistKey?: string;
  /** Réglages du run réel, lus au moment du « Lancer » (l'éditeur les
   *  tient dans ses tabs : format, musique, volumes). */
  getRunParams?: (job: RunJob) => RunParams | undefined;
  /** Notifié après un run réel réussi — l'hôte resynchronise ses
   *  state machines (reloadStatus de TourClient). */
  onRunDone?: (job: RunJob) => void;
}

export type ConsoleSession = ReturnType<typeof useConsoleSession>;

export function useConsoleSession({
  transport,
  tour,
  onTourChange,
  capturedDurations = null,
  mode = "editor",
  hubActions,
  onActivity,
  persistKey,
  getRunParams,
  onRunDone,
}: ConsoleSessionOptions) {
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
  const [probe, setProbe] = useState<{ configured: boolean } | null>(null);

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
  const onActivityRef = useRef(onActivity);
  const getRunParamsRef = useRef(getRunParams);
  const onRunDoneRef = useRef(onRunDone);
  useEffect(() => {
    takesRef.current = takes;
  }, [takes]);
  useEffect(() => {
    tourRef.current = tour;
  }, [tour]);
  useEffect(() => {
    onActivityRef.current = onActivity;
  }, [onActivity]);
  useEffect(() => {
    getRunParamsRef.current = getRunParams;
    onRunDoneRef.current = onRunDone;
  }, [getRunParams, onRunDone]);

  const sections = useMemo(() => (tour ? sectionsOf(tour) : []), [tour]);
  const sectionTitles = useMemo(() => sections.map((s) => s.title), [sections]);
  const sectionEstimates = useMemo(() => sections.map((s) => s.estimatedSec), [sections]);

  useEffect(() => {
    transport.probe().then((p) => setProbe({ configured: p.configured })).catch(() => setProbe({ configured: false }));
  }, [transport]);

  // ── persistance best-effort (hub : sessionStorage, cap 50) ───────
  // hydrate post-mount sur un frame (pattern du dock — pas de mismatch
  // SSR, pas de setState synchrone dans l'effet)
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!persistKey || hydratedRef.current) return;
    const id = requestAnimationFrame(() => {
      hydratedRef.current = true;
      try {
        const raw = sessionStorage.getItem(persistKey);
        if (!raw) return;
        const saved = JSON.parse(raw) as { takes?: Take[]; history?: string[] };
        if (Array.isArray(saved.takes) && saved.takes.length > 0) {
          // une prise figée en streaming au moment de la persistance est
          // close — la session qui la portait n'existe plus
          setTakes((cur) =>
            cur.length > 0
              ? cur
              : saved.takes!.map((t) =>
                  t.status === "streaming" ? { ...t, status: "cancelled" } : t,
                ),
          );
        }
        if (Array.isArray(saved.history)) {
          setHistory((cur) => (cur.length > 0 ? cur : saved.history!));
        }
      } catch {}
    });
    return () => cancelAnimationFrame(id);
  }, [persistKey]);
  useEffect(() => {
    if (!persistKey || !hydratedRef.current) return;
    try {
      sessionStorage.setItem(
        persistKey,
        JSON.stringify({ takes: takes.slice(-PERSIST_CAP), history: history.slice(-PERSIST_CAP) }),
      );
    } catch {}
  }, [persistKey, takes, history]);

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

  // ── flux : auto-scroll + chip reprendre ──────────────────────────
  useEffect(() => {
    const el = flowRef.current;
    if (el && !scrolledUp) el.scrollTop = el.scrollHeight;
  }, [takes, scrolledUp]);

  const onFlowScroll = useCallback(() => {
    const el = flowRef.current;
    if (!el) return;
    setScrolledUp(el.scrollHeight - el.scrollTop - el.clientHeight > 60);
  }, []);

  const resumeScroll = useCallback(() => {
    setScrolledUp(false);
    const el = flowRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // ── reducer d'événements d'une prise (1 event = 1 mutation UI) ───
  const mutateTake = useCallback((id: string, fn: (t: Take) => Take) => {
    setTakes((prev) => prev.map((t) => (t.id === id ? fn(t) : t)));
  }, []);

  const onTakeEvent = useCallback(
    (id: string) => (evt: TakeEvent) => {
      onActivityRef.current?.();
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
            if (evt.status === "done" || evt.status === "error") {
              for (let i = blocks.length - 1; i >= 0; i--) {
                const b = blocks[i];
                if (b.kind === "run-log" && b.state === "running") {
                  blocks[i] = {
                    ...b,
                    state: evt.status === "done" ? "done" : "failed",
                    progress: undefined,
                  };
                  break;
                }
              }
            }
            return { ...t, status: evt.status, blocks };
          }
        }
      });
    },
    [mutateTake],
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
          mode,
          tour: tourRef.current,
          takes: takesRef.current,
          prompt: raw,
          scopeSection: scope,
          ...(tourRef.current
            ? {
                pipeline: {
                  hasCapture: capturedDurations !== null,
                  hasVoiceover: false,
                  hasFinal: false,
                },
              }
            : {}),
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
  }, [streamingId, probe, composerValue, composerScope, sections.length, transport, mode, capturedDurations, onTakeEvent, mutateTake, focusComposer]);

  const cancelStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  // Échap pendant le streaming — niveau window : le composer est
  // désactivé pendant une prise, le focus peut être hors du chrome
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
  const setDiffStates = useCallback(
    (
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
      })),
    [mutateTake],
  );

  const applyBlock = useCallback(
    (takeId: string, blockIdx: number, viaRedo = false) => {
      const take = takesRef.current.find((t) => t.id === takeId);
      const block = take?.blocks[blockIdx];
      if (!take || !block || block.kind !== "step-diff") return;
      if (block.state !== "proposed" && block.state !== "reverted") return;
      if (!tourRef.current || !onTourChange) return;

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
    [onTourChange, version, setDiffStates],
  );

  const revertBlock = useCallback(
    (takeId: string, blockIdx: number) => {
      const take = takesRef.current.find((t) => t.id === takeId);
      const block = take?.blocks[blockIdx];
      if (!take || !block || block.kind !== "step-diff" || block.state !== "applied") return;
      if (!tourRef.current || !onTourChange) return;

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
    [onTourChange, setDiffStates],
  );

  const discardBlock = useCallback(
    (takeId: string, blockIdx: number) =>
      setDiffStates(takeId, blockIdx, "discarded", "discarded"),
    [setDiffStates],
  );
  const restoreBlock = useCallback(
    (takeId: string, blockIdx: number) =>
      setDiffStates(takeId, blockIdx, "proposed", "proposed"),
    [setDiffStates],
  );

  /** Dernier step-diff actionnable (⌘↵ Appliquer / ⌘⌫ Écarter). */
  const latestProposed = useCallback((): { takeId: string; blockIdx: number } | null => {
    for (let ti = takesRef.current.length - 1; ti >= 0; ti--) {
      const t = takesRef.current[ti];
      for (let bi = t.blocks.length - 1; bi >= 0; bi--) {
        const b = t.blocks[bi];
        if (b.kind === "step-diff" && (b.state === "proposed" || b.state === "reverted"))
          return { takeId: t.id, blockIdx: bi };
      }
    }
    return null;
  }, []);
  const applyLatest = useCallback((): boolean => {
    const hit = latestProposed();
    if (hit) applyBlock(hit.takeId, hit.blockIdx);
    return hit !== null;
  }, [latestProposed, applyBlock]);
  const discardLatest = useCallback((): boolean => {
    const hit = latestProposed();
    if (hit) discardBlock(hit.takeId, hit.blockIdx);
    return hit !== null;
  }, [latestProposed, discardBlock]);

  /** ⌘Z / ⇧⌘Z — scope strict au focus console. */
  const undoLast = useCallback(() => {
    const undo = undoStack.current[undoStack.current.length - 1];
    if (undo) revertBlock(undo.takeId, undo.blockIdx);
  }, [revertBlock]);
  const redoLast = useCallback(() => {
    const redo = redoStack.current.pop();
    if (redo) applyBlock(redo.takeId, redo.blockIdx, true);
  }, [applyBlock]);

  // ── runs proposés (Lancer / Pas encore) — VRAI pipeline via le
  // transport (transport.run : routes capture / vo / compose) ; un
  // transport sans run() retombe sur la simulation (mock historique).
  // Relançable depuis l'état failed.
  const launchRun = useCallback(
    async (takeId: string, blockIdx: number) => {
      const take = takesRef.current.find((t) => t.id === takeId);
      const block = take?.blocks[blockIdx];
      if (!take || !block || block.kind !== "run-log") return;
      if (block.state !== "proposed" && block.state !== "failed") return;
      if (streamingId || !tourRef.current) return;
      const job = block.job;
      const tourNow = tourRef.current;

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

      // observe la clôture du run sans dupliquer le reducer d'événements
      let runStatus: "done" | "error" | null = null;
      const baseEmit = onTakeEvent(takeId);
      const emit = (evt: TakeEvent) => {
        if (evt.type === "done") runStatus = evt.status === "done" ? "done" : "error";
        baseEmit(evt);
      };

      try {
        if (transport.run) {
          await transport.run(
            job,
            { tour: tourNow, params: getRunParamsRef.current?.(job) },
            { onEvent: emit, signal: ac.signal },
          );
        } else {
          await simulateRun(job, tourNow, emit, ac.signal);
          runStatus = ac.signal.aborted ? null : "done";
        }
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
        } else if (runStatus === "done") {
          // les * de la timeline tombent : /capture rafraîchit les
          // sections, /vo la voix — compose ne change pas le dirty
          if (job === "capture" || job === "vo") {
            const kind: DirtyKind = job === "capture" ? "capture" : "vo";
            setDirty((prev) => {
              const next = new Map(prev);
              for (const [o, k] of prev) if (k === kind) next.delete(o);
              return next;
            });
          }
          onRunDoneRef.current?.(job);
        }
      } finally {
        setStreamingId(null);
        abortRef.current = null;
        focusComposer();
      }
    },
    [streamingId, transport, mutateTake, onTakeEvent, focusComposer],
  );

  const laterRun = useCallback(
    (takeId: string, blockIdx: number) =>
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
      ),
    [mutateTake],
  );

  // ── actions hub (créer / ouvrir un tour) — confirmation requise ──
  const confirmHubAction = useCallback(
    async (takeId: string, blockIdx: number) => {
      const take = takesRef.current.find((t) => t.id === takeId);
      const block = take?.blocks[blockIdx];
      if (!take || !block || block.kind !== "hub-action" || !hubActions) return;

      if (block.action.type === "open-tour") {
        mutateTake(takeId, (t) => ({
          ...t,
          status: "done",
          blocks: t.blocks.map((b, i) =>
            i === blockIdx && b.kind === "hub-action" ? { ...b, state: "done" } : b,
          ),
        }));
        setDoneAt((prev) => ({ ...prev, [takeId]: new Date().toISOString() }));
        hubActions.openTour(block.action.tourId);
        return;
      }

      // create-tour : POST sur la route existante du hub, puis le bloc
      // passe done et propose « Ouvrir » (le clic d'après navigue).
      if (block.state !== "proposed") return;
      const createdId = block.action.tour.id;
      const created = await hubActions.createTour(block.action.tour);
      if (created.ok) {
        mutateTake(takeId, (t) =>
          appendNote(
            {
              ...t,
              status: "done",
              blocks: t.blocks.map((b, i) =>
                i === blockIdx && b.kind === "hub-action" ? { ...b, state: "done" as const } : b,
              ),
            },
            `tours/${createdId}.json écrit`,
          ),
        );
        setDoneAt((prev) => ({ ...prev, [takeId]: new Date().toISOString() }));
      } else {
        mutateTake(takeId, (t) =>
          appendNote(t, `création impossible — ${created.error ?? "erreur inconnue"}`),
        );
      }
    },
    [hubActions, mutateTake],
  );

  const discardHubAction = useCallback(
    (takeId: string, blockIdx: number) =>
      mutateTake(takeId, (t) => ({
        ...t,
        status: "discarded",
        blocks: t.blocks.map((b, i) =>
          i === blockIdx && b.kind === "hub-action" ? { ...b, state: "discarded" } : b,
        ),
      })),
    [mutateTake],
  );

  /** Ouvrir un tour depuis un bloc create-tour déjà done. */
  const openCreatedTour = useCallback(
    (tourId: string) => hubActions?.openTour(tourId),
    [hubActions],
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
            mode,
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
    [streamingId, transport, mode, mutateTake, onTakeEvent, focusComposer],
  );

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
  const isCompact = useCallback(
    (idx: number, take: Take): boolean => {
      if (take.id === streamingId) return false;
      if (expanded.has(take.id)) return false;
      if (forceCompact) return idx < takes.length - 1;
      return takes.length > COMPACT_AFTER && idx < takes.length - KEEP_EXPANDED;
    },
    [streamingId, expanded, forceCompact, takes.length],
  );
  const compactBoundary = takes.findIndex((t, i) => !isCompact(i, t));

  const expandTake = useCallback((takeId: string) => {
    setExpanded((cur) => {
      const next = new Set(cur);
      next.add(takeId);
      return next;
    });
  }, []);

  const metaFor = useCallback(
    (takeId: string) => (bi: number) =>
      appliedMeta[`${takeId}:${bi}`] ??
      (doneAt[takeId] ? { version: 0, at: doneAt[takeId] } : undefined),
    [appliedMeta, doneAt],
  );

  const noKey = probe !== null && !probe.configured;
  const streaming = streamingId !== null;

  return {
    // état
    takes,
    version,
    streamingId,
    streaming,
    dirty,
    history,
    forceCompact,
    setForceCompact,
    hoverOrdinals,
    setHoverOrdinals,
    scrolledUp,
    probe,
    noKey,
    sections,
    sectionTitles,
    sectionEstimates,
    // composer
    composerValue,
    setComposerValue,
    composerScope,
    setComposerScope,
    taRef,
    focusComposer,
    // flux
    flowRef,
    onFlowScroll,
    resumeScroll,
    isCompact,
    compactBoundary,
    expandTake,
    metaFor,
    durationOf,
    // actions
    handleSend,
    cancelStreaming,
    applyBlock,
    revertBlock,
    discardBlock,
    restoreBlock,
    applyLatest,
    discardLatest,
    undoLast,
    redoLast,
    launchRun,
    laterRun,
    retryTake,
    confirmHubAction,
    discardHubAction,
    openCreatedTour,
  };
}
