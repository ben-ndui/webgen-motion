"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { LogPrefix } from "./types";

/** Affichage humain du préfixe (le « − » typographique pour step-). */
function prefixLabel(p: LogPrefix): string {
  return p === "step-" ? "step−" : p;
}

/**
 * Lignes de log mono avec gutter préfixe 5ch aligné à droite.
 * Une ligne = un event NDJSON. Règle de continuation `│` quand deux
 * lignes consécutives portent le même préfixe (l'armature d'abord).
 * `caret` pose le block clignotant en fin de dernière ligne (streaming).
 */
export function LogLines({
  lines,
  caret = false,
}: {
  lines: { prefix: LogPrefix; text: string }[];
  caret?: boolean;
}) {
  const reduced = useReducedMotion();
  return (
    <div>
      {lines.map((l, i) => {
        const cont = i > 0 && lines[i - 1].prefix === l.prefix;
        return (
          <motion.div
            key={i}
            className="take-log"
            initial={reduced ? false : { opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.18 }}
          >
            <span className={"lp" + (cont ? " cont" : "")} data-p={l.prefix}>
              {cont ? "│" : prefixLabel(l.prefix)}
            </span>
            <span className="lt">
              {l.text}
              {caret && i === lines.length - 1 && <span className="con-caret" />}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

/** Bloc `plan` — un wrapper sémantique autour de LogLines. */
export default function PlanBlock({
  lines,
  caret,
}: {
  lines: { prefix: LogPrefix; text: string }[];
  caret?: boolean;
}) {
  return <LogLines lines={lines} caret={caret} />;
}
