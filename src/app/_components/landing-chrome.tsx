"use client";

import { useEffect, useState } from "react";

/**
 * Landing client chrome — ports landing.js behaviour, scoped to the
 * .gm-landing scroller:
 *  - reveals: IntersectionObserver adds `.in` to `.reveal` elements
 *    (entrance is transform-only, so content shows even without JS),
 *  - active progress dot from the section in view,
 *  - `.scrolled` on the fixed nav once scrolled.
 * Renders the right-side progress dots (click = scroll to section).
 */
export interface LandingSection {
  id: string;
  label: string;
}

export default function LandingChrome({ sections }: { sections: LandingSection[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".gm-landing .scroller");
    if (!root) return;
    document.documentElement.classList.add("reveal-ready");

    const reveals = root.querySelectorAll<HTMLElement>(".reveal");
    const revealObs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            revealObs.unobserve(e.target);
          }
        }
      },
      { root, threshold: 0.16 },
    );
    reveals.forEach((el) => revealObs.observe(el));

    const secEls = Array.from(root.querySelectorAll<HTMLElement>("[data-screen-label]"));
    const sectionObs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.target.id) setActive(e.target.id);
        }
      },
      { root, threshold: 0.55 },
    );
    secEls.forEach((el) => sectionObs.observe(el));

    const nav = document.querySelector<HTMLElement>(".gm-landing .nav");
    const onScroll = () => nav?.classList.toggle("scrolled", root.scrollTop > 8);
    root.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      revealObs.disconnect();
      sectionObs.disconnect();
      root.removeEventListener("scroll", onScroll);
    };
  }, []);

  function go(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav className="progress" aria-label="Sections" data-wm-id="landing.progress">
      {sections.map((s) => (
        <button
          key={s.id}
          type="button"
          className={s.id === active ? "active" : undefined}
          aria-label={s.label}
          aria-current={s.id === active ? "true" : undefined}
          onClick={() => go(s.id)}
        >
          <span className="lbl">{s.label}</span>
        </button>
      ))}
    </nav>
  );
}
