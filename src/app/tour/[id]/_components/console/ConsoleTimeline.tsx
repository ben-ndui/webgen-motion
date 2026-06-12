"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import type { SectionInfo } from "./sections";

export type DirtyKind = "capture" | "vo";

/** Tick 300ms d'une valeur numérique (durées de la timeline). */
function useTicked(value: number, reduced: boolean): number {
  const [disp, setDisp] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (reduced || from === value) {
      setDisp(value);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 300);
      setDisp(from + (value - from) * k);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, reduced]);
  return disp;
}

function Segment({
  ordinal,
  title,
  sec,
  dirty,
  scoped,
  estimated,
  contracted,
  reduced,
}: {
  ordinal: number;
  title: string;
  sec: number;
  dirty: boolean;
  scoped: boolean;
  estimated: boolean;
  contracted: boolean;
  reduced: boolean;
}) {
  const ticked = useTicked(sec, reduced);
  const cls = "tl-seg" + (dirty ? " dirty" : "") + (scoped ? " scoped" : "");
  if (contracted) {
    return (
      <span className={cls} title={`${title} · ${estimated ? "~" : ""}${sec.toFixed(1)}s`}>
        [S{ordinal + 1}]
      </span>
    );
  }
  return (
    <span className={cls} title={title}>
      [S{ordinal + 1}
      {dirty ? "*" : ""}{" "}
      <span className={"dur" + (estimated && !dirty ? " est" : "")}>
        {estimated && !dirty ? `~${Math.round(ticked)}s` : `${ticked.toFixed(1)}s`}
      </span>
      ]
    </span>
  );
}

/**
 * Z2 — timeline ASCII, la carte du tour. Segments `[Sn durée]` joints
 * par `──`, total à droite. Sticky avec Z1. États : sync / dirty `*`
 * accent + hint re-capture / durées estimées `~` / segment scopé /
 * overflow >6 sections (segments non touchés contractés).
 */
export default function ConsoleTimeline({
  sections,
  capturedDurations,
  dirty,
  scopeOrdinal,
  hoverOrdinals,
  onHint,
}: {
  sections: SectionInfo[];
  capturedDurations: number[] | null;
  dirty: ReadonlyMap<number, DirtyKind>;
  scopeOrdinal?: number;
  hoverOrdinals: number[] | null;
  onHint: (kind: DirtyKind) => void;
}) {
  const reduced = useReducedMotion() ?? false;
  if (sections.length === 0) return null;

  const hasCapture = capturedDurations !== null && capturedDurations.length > 0;
  const overflow = sections.length > 6;

  const secOf = (s: SectionInfo): { sec: number; estimated: boolean } => {
    const isDirty = dirty.has(s.ordinal);
    if (isDirty) return { sec: s.estimatedSec, estimated: false };
    if (hasCapture && capturedDurations[s.ordinal] !== undefined)
      return { sec: capturedDurations[s.ordinal], estimated: false };
    return { sec: s.estimatedSec, estimated: true };
  };

  const total = sections.reduce((a, s) => a + secOf(s).sec, 0);
  const totalEstimated = !hasCapture;
  const hintKind: DirtyKind | null = [...dirty.values()].includes("capture")
    ? "capture"
    : dirty.size > 0
      ? "vo"
      : null;

  return (
    <div className="con-tl" data-wm-id="console.timeline">
      <div className="tl-row">
        {sections.map((s) => {
          const { sec, estimated } = secOf(s);
          const isDirty = dirty.has(s.ordinal);
          const scoped =
            scopeOrdinal === s.ordinal || (hoverOrdinals?.includes(s.ordinal) ?? false);
          return (
            <Fragment key={s.ordinal}>
              {s.ordinal > 0 && <span className="tl-join">──</span>}
              <Segment
                ordinal={s.ordinal}
                title={s.title}
                sec={sec}
                dirty={isDirty}
                scoped={scoped}
                estimated={estimated}
                contracted={overflow && !isDirty && !scoped}
                reduced={reduced}
              />
            </Fragment>
          );
        })}
        <span className={"tl-total" + (totalEstimated ? " est" : "")}>
          {totalEstimated ? `~${total.toFixed(1)}s estimé` : `${total.toFixed(1)}s`}
        </span>
      </div>
      {hintKind && (
        <button
          type="button"
          className="tl-hint"
          onClick={() => onHint(hintKind)}
          data-wm-id="console.timeline.hint"
        >
          {hintKind === "capture" ? "re-capture requise ▸" : "re-générer la vo ▸"}
        </button>
      )}
    </div>
  );
}
