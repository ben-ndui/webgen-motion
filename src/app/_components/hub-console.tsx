"use client";

import "../console.css";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  AppWindow,
  ChevronDown,
  List,
  PanelBottom,
  PictureInPicture2,
  X,
} from "lucide-react";
import type { TourEntry } from "@/lib/types/tour";
import { MockTransport } from "../tour/[id]/_components/console/mock-transport";
import { RealTransport } from "../tour/[id]/_components/console/real-transport";
import {
  useConsoleSession,
  type HubActionHandlers,
} from "../tour/[id]/_components/console/useConsoleSession";
import ConsoleSurface from "../tour/[id]/_components/console/ConsoleSurface";

const MODE_KEY = "motion-hubconsole-mode";
const HEIGHT_KEY = "motion-console-h";
const FLOAT_KEY = "motion-console-float";
const TAKES_KEY = "motion-hubconsole-takes";
const CHANNEL = "gm-console";
const WINDOW_URL = "/console/window";
const WINDOW_NAME = "gm-console";
const WINDOW_FEATURES = "width=560,height=760";

const MIN_H = 220;
const DEFAULT_H = 340;
const FLOAT_DEFAULT = { x: -1, y: -1, w: 520, h: 640 }; // -1 = bas-droite

type Mode = "closed" | "drawer" | "float" | "window";

/** Messages du BroadcastChannel "gm-console" (principale ↔ détachée). */
type ChannelMsg =
  | { t: "ping"; nonce: string } // détachée → principale (avant nav)
  | { t: "pong"; nonce: string }
  | { t: "main-ping"; nonce: string } // principale → détachée (vivante ?)
  | { t: "main-pong"; nonce: string }
  | { t: "open-tour"; tourId: string } // détachée → principale : navigue
  | { t: "tour-created"; tourId: string } // détachée → principale : refresh
  | { t: "takes-sync"; payload: string } // détachée → principale : prises
  | { t: "focus" } // principale → détachée : window.focus()
  | { t: "bye" }; // détachée : pagehide

function maxDrawerH(): number {
  return typeof window === "undefined" ? 800 : Math.round(window.innerHeight * 0.8);
}

/**
 * HubConsole — la Director's Console du DASHBOARD, trois modes de
 * présentation persistés (motion-hubconsole-mode) :
 *  - drawer  : barre fine 40px en bas (style « Développeurs » Stripe),
 *              panneau qui monte du bas, resize vertical 220px–80vh
 *  - float   : fenêtre in-page draggable / resizable (520×640)
 *  - window  : fenêtre séparée /console/window (multi-écran),
 *              synchronisée par BroadcastChannel "gm-console"
 *
 * La session (prises, composer) est partagée entre drawer et float —
 * c'est le même useConsoleSession ; la fenêtre séparée est autonome
 * (mêmes routes API, même origin) et persiste via sessionStorage.
 */
export default function HubConsole() {
  const router = useRouter();
  const reduced = useReducedMotion();

  // ── mode + géométries persistés ──────────────────────────────────
  const [mode, setMode] = useState<Mode>("closed");
  const [drawerH, setDrawerH] = useState(DEFAULT_H);
  const [float, setFloat] = useState(FLOAT_DEFAULT);
  const [resizing, setResizing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [unseen, setUnseen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const lastOpenMode = useRef<Exclude<Mode, "closed" | "window">>("drawer");
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
    if (mode === "drawer" || mode === "float") lastOpenMode.current = mode;
  }, [mode]);

  const popupRef = useRef<Window | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const pendingPings = useRef(new Map<string, (alive: boolean) => void>());

  const persistMode = useCallback((next: Mode) => {
    setMode(next);
    if (next !== "closed") setUnseen(false);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {}
  }, []);

  const showNotice = useCallback((text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice(null), 4000);
  }, []);

  // ── transport + session (partagés drawer ↔ float) ────────────────
  const transport = useMemo(() => {
    const wantMock =
      typeof window !== "undefined" &&
      window.localStorage.getItem("motion-console-mock") === "1";
    return wantMock ? new MockTransport() : new RealTransport();
  }, []);

  const hubActions = useMemo<HubActionHandlers>(
    () => ({
      // réutilise la route de création du hub (PUT /api/motion/tour/<id>,
      // même contrat que « Nouveau tour ») — check d'existence d'abord
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
          router.refresh(); // la grille du hub reflète le nouveau tour
          return { ok: true };
        } catch (e) {
          return { ok: false, error: (e as Error).message };
        }
      },
      openTour: (tourId: string) => {
        router.push(`/tour/${encodeURIComponent(tourId)}`);
      },
    }),
    [router],
  );

  const session = useConsoleSession({
    transport,
    mode: "hub",
    hubActions,
    persistKey: TAKES_KEY,
    onActivity: useCallback(() => {
      if (modeRef.current === "closed") setUnseen(true);
    }, []),
  });
  const { focusComposer } = session;

  // ── BroadcastChannel — la principale répond à la détachée ────────
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    const ch = new BroadcastChannel(CHANNEL);
    channelRef.current = ch;
    ch.onmessage = (e: MessageEvent) => {
      const msg = e.data as ChannelMsg;
      switch (msg.t) {
        case "ping":
          ch.postMessage({ t: "pong", nonce: msg.nonce } satisfies ChannelMsg);
          break;
        case "open-tour":
          router.push(`/tour/${encodeURIComponent(msg.tourId)}`);
          break;
        case "tour-created":
          router.refresh();
          break;
        case "takes-sync":
          // mirror best-effort : les prises de la détachée survivent au
          // retour en drawer (sessionStorage de la principale)
          try {
            sessionStorage.setItem(TAKES_KEY, msg.payload);
          } catch {}
          break;
        case "main-pong": {
          const resolve = pendingPings.current.get(msg.nonce);
          if (resolve) {
            pendingPings.current.delete(msg.nonce);
            resolve(true);
          }
          break;
        }
        case "bye":
          if (modeRef.current === "window") persistMode("drawer");
          break;
        default:
          break;
      }
    };
    return () => {
      channelRef.current = null;
      ch.close();
    };
  }, [router, persistMode]);

  /** La fenêtre détachée répond-elle ? (ping/pong, timeout 800ms) */
  const pingPopup = useCallback((timeoutMs = 800): Promise<boolean> => {
    const ch = channelRef.current;
    if (!ch) return Promise.resolve(false);
    return new Promise((resolve) => {
      const nonce = Math.random().toString(36).slice(2);
      pendingPings.current.set(nonce, resolve);
      ch.postMessage({ t: "main-ping", nonce } satisfies ChannelMsg);
      window.setTimeout(() => {
        if (pendingPings.current.delete(nonce)) resolve(false);
      }, timeoutMs);
    });
  }, []);

  // ── hydratation localStorage (post-mount — pas de mismatch SSR) ──
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try {
        const h = parseInt(localStorage.getItem(HEIGHT_KEY) ?? "", 10);
        if (Number.isFinite(h)) setDrawerH(Math.min(maxDrawerH(), Math.max(MIN_H, h)));
        const f = localStorage.getItem(FLOAT_KEY);
        if (f) {
          const parsed = JSON.parse(f) as typeof FLOAT_DEFAULT;
          if (typeof parsed.w === "number") setFloat(parsed);
        }
        const m = localStorage.getItem(MODE_KEY) as Mode | null;
        if (m === "drawer" || m === "float") setMode(m);
        else if (m === "window") {
          // une détachée peut survivre au reload du dashboard — elle
          // seule peut le confirmer (plus de ref sur la popup)
          pingPopup().then((alive) => persistMode(alive ? "window" : "drawer"));
        }
      } catch {}
    });
    return () => cancelAnimationFrame(id);
  }, [pingPopup, persistMode]);

  // ── ⌘J — toggle drawer/float depuis le dashboard ─────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        const cur = modeRef.current;
        if (cur === "window") return; // la console vit dans sa fenêtre
        if (cur === "closed") {
          persistMode(lastOpenMode.current);
          focusComposer();
        } else {
          persistMode("closed");
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [persistMode, focusComposer]);

  // ── fenêtre séparée : ouverture + détection de fermeture ─────────
  const openWindow = useCallback(() => {
    const w = window.open(WINDOW_URL, WINDOW_NAME, WINDOW_FEATURES);
    if (!w) {
      // popup bloquée (ou WebView sans window.open).
      // TODO(Tauri) : créer une WebviewWindow native via l'API Tauri 2
      // (tauri::WebviewWindowBuilder) au lieu de window.open.
      showNotice("fenêtre séparée indisponible ici — mode flottant");
      persistMode("float");
      return;
    }
    popupRef.current = w;
    persistMode("window");
  }, [persistMode, showNotice]);

  useEffect(() => {
    if (mode !== "window") return;
    const iv = window.setInterval(() => {
      const w = popupRef.current;
      if (w && w.closed) {
        popupRef.current = null;
        persistMode("drawer");
      }
    }, 1000);
    return () => window.clearInterval(iv);
  }, [mode, persistMode]);

  const recoverWindow = useCallback(async () => {
    const w = popupRef.current;
    if (w && !w.closed) {
      w.focus();
      channelRef.current?.postMessage({ t: "focus" } satisfies ChannelMsg);
      return;
    }
    // pas de ref (reload de la principale) — la détachée répond ?
    const alive = await pingPopup();
    if (alive) channelRef.current?.postMessage({ t: "focus" } satisfies ChannelMsg);
    else persistMode("drawer");
  }, [pingPopup, persistMode]);

  // ── resize vertical du drawer (poignée, 220px–80vh, persisté) ────
  const onDrawerResizeDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setResizing(true);
    const startY = e.clientY;
    const startH = drawerH;
    const clamp = (h: number) => Math.min(maxDrawerH(), Math.max(MIN_H, h));
    const onMove = (ev: PointerEvent) => setDrawerH(clamp(startH + (startY - ev.clientY)));
    const onUp = (ev: PointerEvent) => {
      setResizing(false);
      const h = clamp(startH + (startY - ev.clientY));
      try {
        localStorage.setItem(HEIGHT_KEY, String(h));
      } catch {}
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // ── float : drag (header) + resize (coin bas-droit), persistés ───
  const floatRect = useCallback(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.min(float.w, vw - 24);
    const h = Math.min(float.h, vh - 24);
    const x = float.x < 0 ? vw - w - 24 : Math.min(Math.max(0, float.x), vw - 60);
    const y = float.y < 0 ? vh - h - 56 : Math.min(Math.max(0, float.y), vh - 48);
    return { x, y, w, h };
  }, [float]);

  const persistFloat = (next: typeof FLOAT_DEFAULT) => {
    setFloat(next);
    try {
      localStorage.setItem(FLOAT_KEY, JSON.stringify(next));
    } catch {}
  };

  const onFloatDragDown = (e: React.PointerEvent) => {
    // ne pas voler le clic des boutons du header
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    setDragging(true);
    const r = floatRect();
    const startX = e.clientX;
    const startY = e.clientY;
    let last = { ...float, x: r.x, y: r.y, w: r.w, h: r.h };
    const onMove = (ev: PointerEvent) => {
      last = {
        ...last,
        x: Math.min(Math.max(0, r.x + (ev.clientX - startX)), window.innerWidth - 60),
        y: Math.min(Math.max(0, r.y + (ev.clientY - startY)), window.innerHeight - 48),
      };
      setFloat(last);
    };
    const onUp = () => {
      setDragging(false);
      persistFloat(last);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const onFloatResizeDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const r = floatRect();
    const startX = e.clientX;
    const startY = e.clientY;
    let last = { ...float, x: r.x, y: r.y, w: r.w, h: r.h };
    const onMove = (ev: PointerEvent) => {
      last = {
        ...last,
        w: Math.min(Math.max(380, r.w + (ev.clientX - startX)), window.innerWidth - r.x),
        h: Math.min(Math.max(320, r.h + (ev.clientY - startY)), window.innerHeight - r.y),
      };
      setFloat(last);
    };
    const onUp = () => {
      persistFloat(last);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // ── rendu ────────────────────────────────────────────────────────
  const dotCls =
    "hc-dot" + (session.streaming ? " live" : unseen && mode === "closed" ? " unseen" : "");

  const surface = (
    <section className="gm-console embed" aria-label="Director's Console — hub">
      <ConsoleSurface session={session} />
    </section>
  );

  if (mode === "float") {
    const r = typeof window === "undefined" ? { x: 0, y: 0, w: 520, h: 640 } : floatRect();
    return (
      <div
        className="gm-hubconsole-float"
        style={{ left: r.x, top: r.y, width: r.w, height: r.h }}
        data-wm-id="console.hub.float"
      >
        <div
          className={"hc-float-head" + (dragging ? " dragging" : "")}
          onPointerDown={onFloatDragDown}
          data-wm-id="console.hub.float.drag"
        >
          <span className={dotCls} />
          <span className="hc-title">console</span>
          <span>· studio</span>
          {notice && <span className="hc-note">{notice}</span>}
          <span className="hc-actions">
            <button
              type="button"
              className={"hc-btn" + (session.forceCompact ? " on" : "")}
              title="Historique compact"
              onClick={() => session.setForceCompact((v) => !v)}
              data-wm-id="console.hub.compact-toggle"
            >
              <List />
            </button>
            <button
              type="button"
              className="hc-btn"
              title="Re-docker en bas"
              onClick={() => persistMode("drawer")}
              data-wm-id="console.hub.dock"
            >
              <PanelBottom />
            </button>
            <button
              type="button"
              className="hc-btn"
              title="Ouvrir dans une fenêtre séparée"
              onClick={openWindow}
              data-wm-id="console.hub.window"
            >
              <AppWindow />
            </button>
            <button
              type="button"
              className="hc-btn"
              title="Fermer"
              onClick={() => persistMode("closed")}
              data-wm-id="console.hub.close"
            >
              <X />
            </button>
          </span>
        </div>
        <div className="hc-float-body">{surface}</div>
        <button
          type="button"
          className="hc-resize-corner"
          onPointerDown={onFloatResizeDown}
          aria-label="Redimensionner la console"
          data-wm-id="console.hub.float.resize"
        />
      </div>
    );
  }

  const drawerOpen = mode === "drawer";

  return (
    <div className="gm-hubconsole" data-mode={mode} data-wm-id="console.hub">
      {drawerOpen && (
        <button
          type="button"
          className={"hc-resize-h" + (resizing ? " dragging" : "")}
          onPointerDown={onDrawerResizeDown}
          aria-label="Redimensionner la console"
          data-wm-id="console.hub.resize"
        />
      )}

      <div className="hc-bar">
        {mode === "window" ? (
          <>
            <span className="hc-dot" />
            <span className="hc-detached">console détachée</span>
            <button
              type="button"
              className="hc-link"
              onClick={recoverWindow}
              data-wm-id="console.hub.recover"
            >
              récupérer
            </button>
            {notice && <span className="hc-note">{notice}</span>}
          </>
        ) : (
          <>
            <button
              type="button"
              className="hc-bar-main"
              onClick={() => {
                const next = drawerOpen ? "closed" : "drawer";
                persistMode(next);
                if (next === "drawer") focusComposer();
              }}
              data-wm-id="console.hub.toggle"
            >
              <span className="hc-chev" aria-hidden>❯</span>
              <span className={dotCls} />
              <span className="hc-title">console</span>
              <span>· studio</span>
              <span className="hc-kbd">⌘J</span>
            </button>
            {notice && <span className="hc-note">{notice}</span>}
            <span className="hc-actions">
              {drawerOpen && (
                <button
                  type="button"
                  className={"hc-btn" + (session.forceCompact ? " on" : "")}
                  title="Historique compact"
                  onClick={() => session.setForceCompact((v) => !v)}
                  data-wm-id="console.hub.compact-toggle"
                >
                  <List />
                </button>
              )}
              {drawerOpen && (
                <button
                  type="button"
                  className="hc-btn"
                  title="Détacher en fenêtre flottante"
                  onClick={() => persistMode("float")}
                  data-wm-id="console.hub.detach"
                >
                  <PictureInPicture2 />
                </button>
              )}
              <button
                type="button"
                className="hc-btn"
                title="Ouvrir dans une fenêtre séparée"
                onClick={openWindow}
                data-wm-id="console.hub.window"
              >
                <AppWindow />
              </button>
              {drawerOpen && (
                <button
                  type="button"
                  className="hc-btn"
                  title="Replier (⌘J)"
                  onClick={() => persistMode("closed")}
                  data-wm-id="console.hub.collapse"
                >
                  <ChevronDown />
                </button>
              )}
            </span>
          </>
        )}
      </div>

      <motion.div
        className="hc-panel"
        initial={false}
        animate={{ height: drawerOpen ? drawerH : 0 }}
        transition={
          resizing || reduced
            ? { duration: 0 }
            : { duration: 0.26, ease: [0.2, 0.7, 0.2, 1] }
        }
      >
        <div className="hc-panel-inner" style={{ height: drawerH }}>
          {drawerOpen && surface}
        </div>
      </motion.div>
    </div>
  );
}
