"use client";

import "../../console.css";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { TourEntry } from "@/lib/types/tour";
import { MockTransport } from "../../tour/[id]/_components/console/mock-transport";
import { RealTransport } from "../../tour/[id]/_components/console/real-transport";
import {
  useConsoleSession,
  type HubActionHandlers,
} from "../../tour/[id]/_components/console/useConsoleSession";
import ConsoleSurface from "../../tour/[id]/_components/console/ConsoleSurface";

const TAKES_KEY = "motion-hubconsole-takes";
const CHANNEL = "gm-console";

type ChannelMsg =
  | { t: "ping"; nonce: string }
  | { t: "pong"; nonce: string }
  | { t: "main-ping"; nonce: string }
  | { t: "main-pong"; nonce: string }
  | { t: "open-tour"; tourId: string }
  | { t: "tour-created"; tourId: string }
  | { t: "takes-sync"; payload: string }
  | { t: "focus" }
  | { t: "bye" };

/**
 * /console/window — la Director's Console en FENÊTRE SÉPARÉE
 * (multi-écran, comme un tool window IntelliJ détaché).
 *
 * AUTONOME pour les prises : elle parle directement aux routes API
 * (même origin). Les actions de NAVIGATION (ouvrir un tour) passent
 * par le BroadcastChannel "gm-console" → la fenêtre principale fait
 * router.push ; si aucune principale ne répond (ping/pong, timeout
 * 800ms), la détachée navigue elle-même (window.opener?.location,
 * fallback location.href).
 */
export default function ConsoleWindowPage() {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const pendingPings = useRef(new Map<string, (alive: boolean) => void>());

  const transport = useMemo(() => {
    const wantMock =
      typeof window !== "undefined" &&
      window.localStorage.getItem("motion-console-mock") === "1";
    return wantMock ? new MockTransport() : new RealTransport();
  }, []);

  /** La principale répond-elle ? (ping/pong, timeout 800ms) */
  const pingMain = useCallback((timeoutMs = 800): Promise<boolean> => {
    const ch = channelRef.current;
    if (!ch) return Promise.resolve(false);
    return new Promise((resolve) => {
      const nonce = Math.random().toString(36).slice(2);
      pendingPings.current.set(nonce, resolve);
      ch.postMessage({ t: "ping", nonce } satisfies ChannelMsg);
      window.setTimeout(() => {
        if (pendingPings.current.delete(nonce)) resolve(false);
      }, timeoutMs);
    });
  }, []);

  /** Navigation sans principale vivante.
   *  TODO(Tauri) : pas de window.opener dans une WebviewWindow — passer
   *  par l'event system Tauri (emit vers la fenêtre principale) quand la
   *  console détachée sera portée en natif. */
  const navigateFallback = useCallback((url: string) => {
    try {
      if (window.opener && !(window.opener as Window).closed) {
        (window.opener as Window).location.href = url;
        (window.opener as Window).focus?.();
        return;
      }
    } catch {}
    window.location.href = url;
  }, []);

  const hubActions = useMemo<HubActionHandlers>(
    () => ({
      createTour: async (tour: TourEntry) => {
        try {
          const head = await fetch(`/api/motion/tour/${encodeURIComponent(tour.id)}`);
          if (head.ok) return { ok: false, error: `un tour "${tour.id}" existe déjà` };
          const res = await fetch(`/api/motion/tour/${encodeURIComponent(tour.id)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tour }),
          });
          const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
          if (!res.ok || !data.ok) return { ok: false, error: data.error ?? `HTTP ${res.status}` };
          channelRef.current?.postMessage({
            t: "tour-created",
            tourId: tour.id,
          } satisfies ChannelMsg);
          return { ok: true };
        } catch (e) {
          return { ok: false, error: (e as Error).message };
        }
      },
      openTour: (tourId: string) => {
        const url = `/tour/${encodeURIComponent(tourId)}`;
        void pingMain().then((alive) => {
          if (alive) {
            channelRef.current?.postMessage({ t: "open-tour", tourId } satisfies ChannelMsg);
          } else {
            navigateFallback(url);
          }
        });
      },
    }),
    [pingMain, navigateFallback],
  );

  const session = useConsoleSession({
    transport,
    mode: "hub",
    hubActions,
    persistKey: TAKES_KEY,
  });
  const { focusComposer, takes } = session;

  // ── channel : pong aux pings de la principale, focus, bye ────────
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    const ch = new BroadcastChannel(CHANNEL);
    channelRef.current = ch;
    ch.onmessage = (e: MessageEvent) => {
      const msg = e.data as ChannelMsg;
      switch (msg.t) {
        case "main-ping":
          ch.postMessage({ t: "main-pong", nonce: msg.nonce } satisfies ChannelMsg);
          break;
        case "pong": {
          const resolve = pendingPings.current.get(msg.nonce);
          if (resolve) {
            pendingPings.current.delete(msg.nonce);
            resolve(true);
          }
          break;
        }
        case "focus":
          window.focus();
          break;
        default:
          break;
      }
    };
    const onBye = () => {
      try {
        ch.postMessage({ t: "bye" } satisfies ChannelMsg);
      } catch {}
    };
    window.addEventListener("pagehide", onBye);
    return () => {
      window.removeEventListener("pagehide", onBye);
      channelRef.current = null;
      ch.close();
    };
  }, []);

  // ── mirror des prises vers la principale (best effort) ───────────
  useEffect(() => {
    if (takes.length === 0) return;
    try {
      const payload = sessionStorage.getItem(TAKES_KEY);
      if (payload) {
        channelRef.current?.postMessage({ t: "takes-sync", payload } satisfies ChannelMsg);
      }
    } catch {}
  }, [takes]);

  useEffect(() => {
    document.title = "GEN MOTION — console";
    focusComposer();
  }, [focusComposer]);

  return (
    <div className="gm-console-window" data-wm-id="console.hub.window-page">
      <header className="hc-win-head">
        <span className={"hc-dot" + (session.streaming ? " live" : "")} />
        <span className="hc-title">console</span>
        <span>— fenêtre connectée</span>
      </header>
      <div className="hc-win-body">
        <section className="gm-console embed" aria-label="Director's Console — fenêtre">
          <ConsoleSurface session={session} />
        </section>
      </div>
    </div>
  );
}
