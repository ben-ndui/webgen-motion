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
import type { ChatTransport } from "./types";
import { MockTransport } from "./mock-transport";
import { RealTransport } from "./real-transport";
import { useConsoleSession } from "./useConsoleSession";
import ConsoleSurface from "./ConsoleSurface";
import ConsoleTimeline, { type DirtyKind } from "./ConsoleTimeline";

const OPEN_KEY = "motion-console-open";
const WIDTH_KEY = "motion-console-w";
const MIN_W = 360;
const MAX_W = 560;

/**
 * Director's Console — le dock ÉDITEUR. Shell additif : enveloppe le
 * <main> de TourClient (children) et pose la 3e colonne (rail 44px
 * replié / panneau 360–560px ouvert, inline ≥1460px, superposé en
 * dessous).
 *
 * Depuis l'étape 1 du chantier hub, le dock n'est plus que le CHROME :
 * Z1 header + Z2 timeline + poignée resize + rail + ⌘J. L'état des
 * prises vit dans useConsoleSession, la vue dans ConsoleSurface —
 * partagés avec la console du hub. Comportement éditeur inchangé.
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
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // ── session (prises, composer, diffs) — découplée du chrome ──────
  const session = useConsoleSession({
    transport,
    tour,
    onTourChange,
    capturedDurations,
    mode: "editor",
    onActivity: useCallback(() => {
      if (!openRef.current) setUnseen(true);
    }, []),
  });

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

  const persistOpen = (next: boolean) => {
    setOpen(next);
    if (next) setUnseen(false);
    try {
      localStorage.setItem(OPEN_KEY, next ? "1" : "0");
    } catch {}
  };

  const { focusComposer } = session;

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

  // ── clavier scope console (⌘Z / ⇧⌘Z / Échap streaming) ───────────
  const onDockKeyDown = (e: React.KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey;
    if (e.key === "Escape" && session.streamingId) {
      e.preventDefault();
      session.cancelStreaming();
      return;
    }
    if (mod && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) session.redoLast();
      else session.undoLast();
    }
  };

  // ── timeline → composer (hint pré-rempli, jamais d'exécution) ────
  const onTimelineHint = (kind: DirtyKind) => {
    focusComposer(kind === "capture" ? "/capture " : "/vo ");
  };

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
              <span className={"con-dot" + (session.streaming ? " live" : "")} />
              <span>console</span>
              <span className="ch-id">{tour.id}</span>
              <span className="ch-v">· v{session.version}</span>
              <span className="ch-actions">
                <button
                  type="button"
                  className={"ch-btn" + (session.forceCompact ? " on" : "")}
                  title="Historique compact"
                  onClick={() => session.setForceCompact((v) => !v)}
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

            {/* Z2 — timeline ASCII (toujours là quand il y a un tour) */}
            <ConsoleTimeline
              sections={session.sections}
              capturedDurations={capturedDurations}
              dirty={session.dirty}
              scopeOrdinal={session.composerScope}
              hoverOrdinals={session.hoverOrdinals}
              onHint={onTimelineHint}
            />

            {/* Z3 + Z4 — flux + composer (surface partagée) */}
            <ConsoleSurface session={session} tour={tour} onOpenCompose={onOpenCompose} />
          </section>
        )}
      </div>
    </div>
  );
}
