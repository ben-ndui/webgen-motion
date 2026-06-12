"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { TourEntry } from "@/lib/types/tour";
import { sectionsOf } from "./sections";

/**
 * État vide / première visite — accueil UNE ligne + 4 suggestions
 * calculées depuis le tour réel. Clic = injecte le texte dans le
 * composer (focus, caret en fin) — on n'envoie jamais à la place de
 * l'utilisateur.
 */
export default function ConsoleEmpty({
  tour,
  onPick,
}: {
  tour: TourEntry;
  onPick: (text: string) => void;
}) {
  const reduced = useReducedMotion();

  const suggestions = useMemo(() => {
    const sections = sectionsOf(tour);
    const hasVo = tour.steps.some((s) => "voiceover" in s && s.voiceover);
    const out: string[] = [];
    out.push(`raccourcis la section ${Math.min(2, Math.max(1, sections.length))}`);
    out.push(
      hasVo
        ? "réécris la voix off de l'intro, plus sobre"
        : "écris la voix off de l'intro",
    );
    if (sections.length > 0) {
      const o = Math.min(3, sections.length);
      out.push(`@S${o} ajoute un hotspot sur le bouton principal`);
    }
    out.push("/compose en preset cinematic");
    return out;
  }, [tour]);

  return (
    <div className="con-empty">
      <motion.p
        className="ce-msg"
        initial={reduced ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.26 }}
      >
        Décris ce que tu veux — j&apos;écris dans le scénario.
      </motion.p>
      <div>
        <motion.span
          className="ce-try"
          initial={reduced ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.26, delay: reduced ? 0 : 0.06 }}
        >
          essaie :
        </motion.span>
        <div className="ce-sug" style={{ marginTop: 8 }}>
          {suggestions.map((s, i) => (
            <motion.button
              key={s}
              type="button"
              onClick={() => onPick(s)}
              initial={reduced ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.26, delay: reduced ? 0 : 0.12 + i * 0.06 }}
              data-wm-id="console.suggestion"
            >
              <span className="sb" aria-hidden>▸</span>
              <span>{s}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
