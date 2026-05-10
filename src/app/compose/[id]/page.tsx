"use client";

import { use, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getCategory,
  type MotionCategory,
  MOTION_CATEGORIES,
} from "@/lib/motion-categories";

/**
 * Compositor stage. This page is the "post-production" step: it
 * fetches the manifest produced by the per-section capture, then
 * plays each section's MP4 inside an animated Mac browser chrome
 * with the section's category color as backdrop. Transitions
 * between sections crossfade the bg + scale the chrome in/out.
 *
 * Two modes:
 *  - **Preview** (default): manual playback, restart button. Good
 *    for iterating on motion design without burning runner time.
 *  - **Autoplay** (`?autoplay=1`): used by `scripts/compose-tour.ts`.
 *    Plays the whole sequence end-to-end without controls and sets
 *    `window.__motionComposeDone = true` when finished, so the
 *    headless runner knows when to stop capturing frames.
 */

interface Section {
  index: number;
  categoryId: string;
  title: string;
  subtitle?: string;
  durationSec: number;
  mp4Url: string;
}

interface Manifest {
  tourId: string;
  width: number;
  height: number;
  fps: number;
  format?: "16:9" | "9:16";
  sections: Section[];
  totalDurationSec: number;
  hasVoiceover?: boolean;
  voiceoverUrl?: string | null;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Note: this route is intentionally NOT wrapped with AdminGuard.
 * The manifest API it depends on is gated by NODE_ENV=development,
 * so the page is harmless in production (just shows an error). The
 * gain: the headless compose runner can hit it without minting a
 * Firebase session cookie.
 */
export default function ComposePage({ params }: PageProps) {
  const { id } = use(params);
  return <ComposeStage tourId={id} />;
}

type Phase =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "intro" } // brief lead-in before first section
  | { kind: "playing"; sectionIndex: number }
  | { kind: "transition"; fromIndex: number; toIndex: number }
  | { kind: "outro" }
  | { kind: "done" };

function ComposeStage({ tourId }: { tourId: string }) {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  // URL params drive the playback mode :
  //  - autoplay=1  → headless capture mode (compose-tour.ts), no audio
  //  - audio=0     → silence the audio elements (default off in autoplay
  //                   mode for the headless runner, default on for
  //                   human preview)
  //  - bgMusicId   → which library track to layer underneath
  //  - bgVol / voVol → playback volumes (compose mix params previewed live)
  const params =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const autoplay = params.get("autoplay") === "1";
  const audioEnabled =
    params.get("audio") === null
      ? !autoplay // default : audio off in capture mode, on for human preview
      : params.get("audio") === "1";
  const bgMusicId = params.get("bgMusicId") || null;
  const bgVol = clampVol(parseFloat(params.get("bgVol") || ""), 0.18);
  const voVol = clampVol(parseFloat(params.get("voVol") || ""), 1.0);
  const voRef = useRef<HTMLAudioElement | null>(null);
  const bgRef = useRef<HTMLAudioElement | null>(null);

  // Mark window.__motionComposeDone when the run completes — the
  // headless runner polls for this to know when to stop capturing.
  useEffect(() => {
    if (phase.kind === "done") {
      (window as unknown as { __motionComposeDone?: boolean }).__motionComposeDone = true;
    }
  }, [phase]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/motion/tour/manifest?id=${encodeURIComponent(tourId)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || `HTTP ${r.status}`);
        return r.json();
      })
      .then((m: Manifest) => {
        if (cancelled) return;
        setManifest(m);
        if (m.sections.length === 0) {
          setPhase({ kind: "error", message: "Aucune section dans le manifest" });
          return;
        }
        if (autoplay) {
          // Brief intro hold so the headless capture has frames at
          // t=0 with everything settled, then start.
          setTimeout(() => setPhase({ kind: "playing", sectionIndex: 0 }), 400);
          setPhase({ kind: "intro" });
        } else {
          setPhase({ kind: "intro" });
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setPhase({
          kind: "error",
          message: e instanceof Error ? e.message : "Manifest fetch failed",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [tourId, autoplay]);

  // Sync audio playback to section playback. Audio is "armed" once
  // playback enters playing phase the first time, then keeps running
  // until done. Pause on done for a clean tail. NOTE: this MUST sit
  // above the early returns below — React requires the hook count
  // to be stable across renders, and loading short-circuits otherwise
  // drop this hook.
  useEffect(() => {
    if (!audioEnabled) return;
    const vo = voRef.current;
    const bg = bgRef.current;
    if (vo) vo.volume = clampVol(voVol, 1.0);
    if (bg) bg.volume = clampVol(bgVol, 0.18);
    if (phase.kind === "playing") {
      vo?.play().catch(() => {});
      bg?.play().catch(() => {});
    } else if (phase.kind === "done") {
      vo?.pause();
      bg?.pause();
    }
  }, [phase.kind, audioEnabled, bgVol, voVol]);

  if (phase.kind === "loading") return <FullStageMsg msg="Chargement du manifest…" />;
  if (phase.kind === "error") return <FullStageMsg msg={phase.message} isError />;
  if (!manifest) return null;

  const currentIdx =
    phase.kind === "playing"
      ? phase.sectionIndex
      : phase.kind === "transition"
        ? phase.toIndex
        : phase.kind === "intro"
          ? 0
          : manifest.sections.length - 1;
  const current = manifest.sections[currentIdx];
  const cat = getCategory(current.categoryId) ?? MOTION_CATEGORIES.branding;

  const onVideoEnded = () => {
    if (phase.kind !== "playing") return;
    const nextIdx = phase.sectionIndex + 1;
    if (nextIdx >= manifest.sections.length) {
      setPhase({ kind: "outro" });
      // Hold outro briefly, then mark done.
      setTimeout(() => setPhase({ kind: "done" }), autoplay ? 1800 : 0);
      return;
    }
    setPhase({
      kind: "transition",
      fromIndex: phase.sectionIndex,
      toIndex: nextIdx,
    });
    // After the chrome exit + bg crossfade window, advance to next.
    setTimeout(
      () => setPhase({ kind: "playing", sectionIndex: nextIdx }),
      650,
    );
  };

  const bgMusicSrc = bgMusicId
    ? `/api/motion/audio/${encodeURIComponent(bgMusicId)}/stream`
    : null;
  const voSrc = manifest?.voiceoverUrl ?? null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: cat.bgColor,
        transition: "background-color 600ms cubic-bezier(0.22,0.61,0.36,1)",
        overflow: "hidden",
      }}
    >
      {/* Subtle radial accent in the corners */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at top right, ${cat.accent}22, transparent 60%), radial-gradient(ellipse at bottom left, ${cat.accent}1a, transparent 50%)`,
          pointerEvents: "none",
        }}
      />

      {/* Section label in the corner — small, faint */}
      <div
        style={{
          position: "absolute",
          top: 32,
          left: 32,
          color: cat.fg,
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          opacity: 0.65,
          zIndex: 1,
        }}
      >
        {cat.label}
        {current.subtitle && (
          <span
            style={{
              opacity: 0.6,
              marginLeft: 12,
              textTransform: "none",
              letterSpacing: "0.01em",
              fontWeight: 400,
            }}
          >
            · {current.subtitle}
          </span>
        )}
      </div>

      {/* Section index counter (top right) */}
      <div
        style={{
          position: "absolute",
          top: 32,
          right: 40,
          color: cat.fg,
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 14,
          fontWeight: 500,
          letterSpacing: "0.06em",
          opacity: 0.5,
          zIndex: 1,
        }}
      >
        {String(currentIdx + 1).padStart(2, "0")} / {String(manifest.sections.length).padStart(2, "0")}
      </div>

      {/* Mac chrome stage — animated entrance/exit per section */}
      <AnimatePresence mode="wait">
        {(phase.kind === "playing" || phase.kind === "intro") && (
          <motion.div
            key={`section-${currentIdx}-${phase.kind}`}
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.04, y: -16 }}
            transition={{
              duration: 0.55,
              ease: [0.22, 0.61, 0.36, 1],
            }}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "80px 80px 60px",
            }}
          >
            <DeviceFrame
              url={`uzme.app${pathHintFor(current)}`}
              tabTitle={current.title}
              cat={cat}
              format={manifest.format ?? "16:9"}
            >
              {phase.kind === "playing" ? (
                <video
                  key={current.mp4Url}
                  src={current.mp4Url}
                  autoPlay
                  muted
                  playsInline
                  onEnded={onVideoEnded}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    // anchor the crop to the top of the captured page
                    // so headers/heroes stay visible — Mac chrome's
                    // 44px title bar + iPhone Dynamic Island make the
                    // inner area slightly different from the video's
                    // native aspect, and centering would eat the top.
                    objectPosition: "top",
                    backgroundColor: "#000",
                    display: "block",
                  }}
                />
              ) : (
                // Intro: show the first section's title centered inside
                // the chrome before the video starts. Doubles as a
                // breath for the autoplay capture.
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#0F1117",
                    color: "white",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    gap: 18,
                  }}
                >
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 500,
                      color: cat.accent,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                    }}
                  >
                    {manifest.sections.length} chapitre
                    {manifest.sections.length > 1 ? "s" : ""}
                  </div>
                  <div
                    style={{
                      fontSize: 64,
                      fontWeight: 800,
                      letterSpacing: "-0.02em",
                      textAlign: "center",
                      maxWidth: "80%",
                      lineHeight: 1.05,
                    }}
                  >
                    {manifest.tourId.replace(/-/g, " ")}
                  </div>
                  {!autoplay && (
                    <button
                      onClick={() =>
                        setPhase({ kind: "playing", sectionIndex: 0 })
                      }
                      style={{
                        marginTop: 20,
                        padding: "12px 32px",
                        borderRadius: 9999,
                        backgroundColor: cat.accent,
                        color: "#0B1020",
                        border: "none",
                        fontSize: 16,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      ▶ Lancer la composition
                    </button>
                  )}
                </div>
              )}
            </DeviceFrame>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Outro card */}
      <AnimatePresence>
        {phase.kind === "outro" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 24,
              color: cat.fg,
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            <div
              style={{
                fontSize: 96,
                fontWeight: 800,
                letterSpacing: "-0.025em",
                lineHeight: 1.05,
              }}
            >
              UZME
            </div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 500,
                color: cat.accent,
                letterSpacing: "-0.005em",
              }}
            >
              uzme.app
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden audio elements driven by playback phase. Mounted only
          when audioEnabled (i.e. human preview, not headless capture).
          The headless compose runner explicitly passes ?audio=0 to
          mute these — its own mux happens via ffmpeg, not the page. */}
      {audioEnabled && voSrc && (
        <audio
          ref={voRef}
          src={voSrc}
          preload="auto"
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, width: 0, height: 0, opacity: 0, pointerEvents: "none" }}
        />
      )}
      {audioEnabled && bgMusicSrc && (
        <audio
          ref={bgRef}
          src={bgMusicSrc}
          preload="auto"
          loop
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, width: 0, height: 0, opacity: 0, pointerEvents: "none" }}
        />
      )}
    </div>
  );
}

function clampVol(v: number, fallback: number): number {
  if (!Number.isFinite(v)) return fallback;
  if (v < 0) return 0;
  if (v > 2) return 2;
  return v;
}

// ── Mac browser chrome ────────────────────────────────────────────

// ── Device frame dispatcher ───────────────────────────────────────

function DeviceFrame({
  url,
  tabTitle,
  cat,
  format,
  children,
}: {
  url: string;
  tabTitle: string;
  cat: MotionCategory;
  format: "16:9" | "9:16";
  children: React.ReactNode;
}) {
  if (format === "9:16") {
    return (
      <IPhoneFrame cat={cat} tabTitle={tabTitle}>
        {children}
      </IPhoneFrame>
    );
  }
  return (
    <MacBrowserChrome url={url} tabTitle={tabTitle} cat={cat}>
      {children}
    </MacBrowserChrome>
  );
}

// ── iPhone frame (used for 9:16 portrait tours) ───────────────────

function IPhoneFrame({
  cat,
  tabTitle,
  children,
}: {
  cat: MotionCategory;
  tabTitle: string;
  children: React.ReactNode;
}) {
  // Frame aspect = 9:16 to match the captured 1080×1920 video pixel-
  // for-pixel (no awkward letterbox or crop). Real iPhones are 9:19.5
  // but for short-form delivery (TikTok/Reels/Stories) 9:16 IS the
  // canonical canvas — visual fit > device realism.
  return (
    <div
      style={{
        position: "relative",
        height: "94%",
        aspectRatio: "9 / 16",
        backgroundColor: "#0B0B0F",
        borderRadius: 56,
        padding: 12,
        boxShadow:
          "0 80px 160px rgba(0,0,0,0.55), 0 40px 80px rgba(0,0,0,0.35), inset 0 0 0 2px rgba(255,255,255,0.08)",
      }}
    >
      {/* Inner screen */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: 50,
          overflow: "hidden",
          backgroundColor: "#000",
        }}
      >
        {children}
        {/* Dynamic Island */}
        <div
          style={{
            position: "absolute",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            width: 110,
            height: 34,
            borderRadius: 9999,
            backgroundColor: "#000",
            zIndex: 4,
          }}
        />
        {/* Faux status bar (left = time, right = signal/wifi/battery) */}
        <div
          style={{
            position: "absolute",
            top: 14,
            left: 22,
            right: 22,
            height: 34,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#fff",
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: 14,
            fontWeight: 600,
            zIndex: 5,
            pointerEvents: "none",
          }}
        >
          <span>9:41</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {/* signal bars */}
            <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor">
              <rect x="0" y="7" width="3" height="4" rx="0.5" />
              <rect x="4.5" y="5" width="3" height="6" rx="0.5" />
              <rect x="9" y="2.5" width="3" height="8.5" rx="0.5" />
              <rect x="13.5" y="0" width="3" height="11" rx="0.5" opacity="0.5" />
            </svg>
            {/* wifi */}
            <svg width="15" height="11" viewBox="0 0 15 11" fill="currentColor">
              <path d="M7.5 11l-2-2.5a3 3 0 014 0L7.5 11z" />
              <path d="M2 5.5a8 8 0 0111 0l-1.5 1.8a5.5 5.5 0 00-8 0L2 5.5z" />
              <path d="M0 3.2a11 11 0 0115 0l-1.5 1.6a8.5 8.5 0 00-12 0L0 3.2z" opacity="0.85" />
            </svg>
            {/* battery */}
            <svg width="26" height="11" viewBox="0 0 26 11" fill="none">
              <rect x="0" y="0" width="22" height="11" rx="2.5" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1" />
              <rect x="2" y="2" width="14" height="7" rx="1" fill="currentColor" />
              <rect x="23" y="3.5" width="2" height="4" rx="1" fill="currentColor" opacity="0.5" />
            </svg>
          </span>
        </div>
        {/* Home indicator */}
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: "50%",
            transform: "translateX(-50%)",
            width: 134,
            height: 5,
            borderRadius: 9999,
            backgroundColor: "rgba(255,255,255,0.85)",
            zIndex: 5,
            pointerEvents: "none",
          }}
        />
      </div>
      {/* Cat-tinted accent dot bottom-right (subtle brand cue) */}
      <div
        style={{
          position: "absolute",
          bottom: -16,
          right: 32,
          width: 8,
          height: 8,
          borderRadius: 9999,
          backgroundColor: cat.accent,
          boxShadow: `0 0 16px ${cat.accent}aa`,
        }}
        title={tabTitle}
      />
    </div>
  );
}

function MacBrowserChrome({
  url,
  tabTitle,
  cat,
  children,
}: {
  url: string;
  tabTitle: string;
  cat: MotionCategory;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 1640,
        aspectRatio: "16 / 9",
        backgroundColor: "#1a1a1f",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow:
          "0 60px 140px rgba(0,0,0,0.55), 0 30px 60px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.06)",
      }}
    >
      {/* Title bar */}
      <div
        style={{
          height: 44,
          display: "flex",
          alignItems: "center",
          paddingLeft: 16,
          paddingRight: 16,
          gap: 14,
          background:
            "linear-gradient(180deg, #2a2a32 0%, #1f1f25 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Traffic lights */}
        <div style={{ display: "flex", gap: 8 }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              backgroundColor: "#FF5F57",
              boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.18)",
            }}
          />
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              backgroundColor: "#FEBC2E",
              boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.18)",
            }}
          />
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              backgroundColor: "#28C840",
              boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.18)",
            }}
          />
        </div>

        {/* URL bar pill */}
        <div
          style={{
            flex: 1,
            height: 26,
            maxWidth: 540,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255,255,255,0.06)",
            borderRadius: 8,
            color: "rgba(255,255,255,0.78)",
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 12,
            fontWeight: 500,
            paddingLeft: 12,
            paddingRight: 12,
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="2"
            style={{ marginRight: 6 }}
          >
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          {url}
        </div>

        {/* Tab indicator on the right */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            paddingLeft: 8,
            paddingRight: 6,
            color: "rgba(255,255,255,0.55)",
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: 12,
            fontWeight: 500,
            maxWidth: 220,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={tabTitle}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              backgroundColor: cat.accent,
            }}
          />
          {tabTitle}
        </div>
      </div>

      {/* Content area */}
      <div
        style={{
          width: "100%",
          height: "calc(100% - 44px)",
          backgroundColor: "#000",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function FullStageMsg({ msg, isError }: { msg: string; isError?: boolean }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#0B1020",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: isError ? "#E17055" : "#9aa1b1",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: 18,
        padding: 32,
        textAlign: "center",
      }}
    >
      {msg}
    </div>
  );
}

function pathHintFor(s: Section): string {
  // Best-effort path display in the URL bar — purely cosmetic.
  // Future revs can store the original startPath in the manifest.
  if (s.categoryId === "pricing") return "/pricing";
  if (s.categoryId === "branding") return "/";
  if (s.categoryId === "stores" || s.categoryId === "releases") return "/admin/deploys";
  if (s.categoryId === "ai") return "/admin/ai";
  if (s.categoryId === "motion") return "/admin/motion-studio";
  if (s.categoryId === "pipeline") return "/admin/deploys";
  return "";
}
