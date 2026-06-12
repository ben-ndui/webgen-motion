"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Landing v0.3 — la métaphore du produit en une animation : un tour
 * JSON qui se « compile » en vidéo, en boucle. Touches terminal
 * (Geist Mono, chevron, caret) cohérentes avec la DA du chat IA à
 * venir. Tokens only, light/dark gratuits.
 *
 * Phases : json (les lignes du tour s'écrivent) → build (commande +
 * progress) → done (final.mp4 régénéré) → hold → reset.
 */

const JSON_LINES = [
  `{ "id": "mon-produit",`,
  `  "steps": [`,
  `    { "type": "section", "title": "Dashboard" },`,
  `    { "type": "click",   "selector": "#reserver" },`,
  `    { "type": "overlay", "voiceover": "Réservez en deux clics." }`,
  `] }`,
];

type Phase = "json" | "build" | "done";

export default function HeroCompileLoop() {
  const [phase, setPhase] = useState<Phase>("json");
  const [lines, setLines] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (phase === "json") {
      if (lines < JSON_LINES.length) {
        timer = setTimeout(() => setLines((n) => n + 1), 260);
      } else {
        timer = setTimeout(() => setPhase("build"), 600);
      }
    } else if (phase === "build") {
      timer = setTimeout(() => setPhase("done"), 1700);
    } else {
      timer = setTimeout(() => {
        setLines(0);
        setPhase("json");
      }, 2600);
    }
    return () => clearTimeout(timer);
  }, [phase, lines]);

  return (
    <div className="compile-card" data-wm-id="landing.hero.compile" aria-hidden>
      <div className="compile-tab">
        <span className="compile-dot" />
        tour.json
      </div>
      <div className="compile-body">
        {JSON_LINES.slice(0, lines).map((l, i) => (
          <motion.div
            key={i}
            className="compile-line"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.18 }}
          >
            {l}
          </motion.div>
        ))}
        {phase === "json" && lines < JSON_LINES.length && (
          <span className="compile-caret" />
        )}
        <AnimatePresence>
          {phase !== "json" && (
            <motion.div
              className="compile-cmd"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <span className="compile-chevron">❯</span> gen capture &amp;&amp; gen compose
              {phase === "build" ? (
                <motion.span
                  className="compile-progress"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 1.55, ease: "easeInOut" }}
                />
              ) : (
                <motion.span
                  className="compile-done"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  ✓ final.mp4 régénéré
                </motion.span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
