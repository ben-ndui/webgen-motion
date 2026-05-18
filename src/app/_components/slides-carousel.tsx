"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * <SlidesCarousel /> — Sprint 13 landing redesign.
 *
 * Carrousel horizontal full-screen avec :
 *   • Navigation : flèches ← → buttons + arrows clavier + swipe touch + dots indicator
 *   • Auto-play 5s pause-on-hover/focus/touch
 *   • Tous les slides présents en DOM (CSS transform pour mouvement) →
 *     SEO/accessibility friendly, crawlers lisent tout le contenu
 *   • Indications IA : data-tour-section, data-wm-id, aria-roledescription
 *
 * Usage : passer N children, chaque enfant = 1 slide full-viewport.
 * Le container gère la navigation + auto-play, les slides sont juste
 * des sections HTML standard.
 */

const AUTOPLAY_MS = 5000;
const RESUME_AFTER_INTERACTION_MS = 8000;

interface Props {
  children: React.ReactNode[];
  slideLabels?: string[]; // accessibility + data-tour-section
}

export default function SlidesCarousel({ children, slideLabels }: Props) {
  const slides = Array.isArray(children) ? children : [children];
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const goTo = useCallback(
    (i: number) => {
      setIndex(((i % count) + count) % count);
    },
    [count],
  );
  const next = useCallback(() => goTo(index + 1), [index, goTo]);
  const prev = useCallback(() => goTo(index - 1), [index, goTo]);

  // auto-play
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [paused, count]);

  // keyboard navigation (left / right arrows)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        next();
        pauseTemporarily();
      } else if (e.key === "ArrowLeft") {
        prev();
        pauseTemporarily();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  // pause then resume after a delay — gives the user time to read
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function pauseTemporarily() {
    setPaused(true);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setPaused(false), RESUME_AFTER_INTERACTION_MS);
  }

  // touch swipe
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 50) return;
    if (dx < 0) next();
    else prev();
    pauseTemporarily();
  }

  // wheel / trackpad — intercept aussi bien deltaX (swipe horizontal
  // trackpad Mac) que deltaY (molette souris) car sur un carrousel
  // full-screen l'utilisateur s'attend à ce que LES DEUX naviguent.
  // Debounce 800ms pour pas avancer multiple slides au moindre scroll.
  const lastWheel = useRef<number>(0);
  function onWheel(e: React.WheelEvent) {
    // Prend la composante avec la magnitude la plus grande (trackpad
    // swipe = principalement deltaX, molette = deltaY)
    const delta =
      Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(delta) < 30) return; // ignore micro-mouvements
    const now = Date.now();
    if (now - lastWheel.current < 800) return; // debounce
    lastWheel.current = now;
    if (delta > 0) next();
    else prev();
    pauseTemporarily();
  }

  return (
    <section
      ref={containerRef}
      className="relative h-screen overflow-hidden bg-white"
      role="region"
      aria-roledescription="carousel"
      aria-label="GEN MOTION landing slides"
      data-wm-id="landing.carousel"
      data-tour-section="landing-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onWheel={onWheel}
    >
      {/* Track contains all slides side-by-side, translateX pour montrer
          la slide active. Transition cubic-bezier douce 500ms.
          translateX(%) est relatif à la WIDTH de l'élément translaté
          (le track), pas au container. Track fait `count * 100%`,
          donc 1 viewport = 100/count % du track. */}
      <div
        className="flex h-full transition-transform duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)]"
        style={{
          transform: `translateX(-${(index * 100) / count}%)`,
          width: `${count * 100}%`,
        }}
      >
        {slides.map((slide, i) => {
          const label = slideLabels?.[i] ?? `slide-${i + 1}`;
          return (
            <div
              key={i}
              className="h-full shrink-0"
              style={{ width: `${100 / count}%` }}
              role="group"
              aria-roledescription="slide"
              aria-label={`Slide ${i + 1} sur ${count} : ${label}`}
              aria-current={i === index ? "true" : undefined}
              data-wm-id={`landing.slide.${label}`}
              data-tour-section={`landing-slide-${label}`}
              data-tour-slide-index={i}
              aria-hidden={i !== index}
            >
              {slide}
            </div>
          );
        })}
      </div>

      {/* Arrow buttons — faded, hover-visible, gradient en mask pour
          pas distraire du contenu */}
      <button
        type="button"
        onClick={() => {
          prev();
          pauseTemporarily();
        }}
        className="group absolute left-0 top-0 bottom-0 w-20 sm:w-32 flex items-center justify-start pl-3 sm:pl-6 z-10 focus:outline-none"
        aria-label="Slide précédente"
        data-wm-id="landing.carousel.prev"
      >
        <span className="grid place-items-center w-10 h-10 rounded-full border border-zinc-200 bg-white/80 text-zinc-700 opacity-30 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
          <ChevronLeft className="w-5 h-5" />
        </span>
      </button>
      <button
        type="button"
        onClick={() => {
          next();
          pauseTemporarily();
        }}
        className="group absolute right-0 top-0 bottom-0 w-20 sm:w-32 flex items-center justify-end pr-3 sm:pr-6 z-10 focus:outline-none"
        aria-label="Slide suivante"
        data-wm-id="landing.carousel.next"
      >
        <span className="grid place-items-center w-10 h-10 rounded-full border border-zinc-200 bg-white/80 text-zinc-700 opacity-30 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
          <ChevronRight className="w-5 h-5" />
        </span>
      </button>

      {/* Dots indicator — bottom center, clickable */}
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2"
        role="tablist"
        aria-label="Sélectionner une slide"
      >
        {slides.map((_, i) => {
          const label = slideLabels?.[i] ?? `slide ${i + 1}`;
          const active = i === index;
          return (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={`Aller à la slide ${i + 1} : ${label}`}
              onClick={() => {
                goTo(i);
                pauseTemporarily();
              }}
              className={`h-1.5 rounded-full transition-all ${
                active
                  ? "w-8 bg-zinc-950"
                  : "w-1.5 bg-zinc-300 hover:bg-zinc-500"
              }`}
              data-wm-id={`landing.carousel.dot.${i}`}
            />
          );
        })}
      </div>

      {/* Slide counter — top right, mono small */}
      <div className="absolute top-5 right-6 z-10 text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-400">
        {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
      </div>
    </section>
  );
}
