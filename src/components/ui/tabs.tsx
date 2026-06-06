"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "./cn";

/** useLayoutEffect on the client, useEffect on the server (no SSR warning). */
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Tabs — strip with a sliding accent underline (editor.css tab strip).
 * The indicator is positioned from the active tab's offsetLeft/offsetWidth
 * and animates left/width. Controlled via value/onValueChange.
 */
export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
  /** mono index shown before the label, e.g. "01". */
  number?: string;
  /** optional trailing badge node (e.g. a count). */
  badge?: ReactNode;
}

export interface TabsProps<T extends string> {
  tabs: TabItem<T>[];
  value: T;
  onValueChange: (value: T) => void;
  className?: string;
}

export function Tabs<T extends string>({
  tabs,
  value,
  onValueChange,
  className,
}: TabsProps<T>) {
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [ind, setInd] = useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  });

  // Depend on `tabs.length` (a primitive), never the array identity —
  // callers pass inline arrays, so depending on `tabs` would re-run every
  // render and loop. The setInd guard skips redundant equal updates.
  useIsoLayoutEffect(() => {
    function measure() {
      const el = btnRefs.current[value];
      if (!el) return;
      const left = el.offsetLeft;
      const width = el.offsetWidth;
      setInd((prev) =>
        prev.left === left && prev.width === width ? prev : { left, width },
      );
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [value, tabs.length]);

  return (
    <div
      role="tablist"
      className={cn("relative flex items-center gap-1 border-b border-line", className)}
    >
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            ref={(el) => {
              btnRefs.current[t.value] = el;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onValueChange(t.value)}
            className={cn(
              "ring-token relative inline-flex items-center gap-2 px-3 py-3 text-sm font-medium cursor-pointer transition-colors duration-150",
              active ? "text-ink" : "text-muted hover:text-ink",
            )}
          >
            {t.number && (
              <span className="font-mono text-[11px] text-faint">{t.number}</span>
            )}
            <span>{t.label}</span>
            {t.badge != null && (
              <span
                className={cn(
                  "font-mono text-[10px] px-[6px] py-px rounded-full border",
                  active
                    ? "bg-accent-soft text-accent border-accent-line"
                    : "bg-surface-2 text-muted border-line",
                )}
              >
                {t.badge}
              </span>
            )}
          </button>
        );
      })}
      <span
        aria-hidden
        className="absolute bottom-[-1px] h-[2px] bg-accent rounded-[2px] transition-[left,width] duration-[280ms] ease-[cubic-bezier(.5,0,.2,1)]"
        style={{ left: ind.left, width: ind.width }}
      />
    </div>
  );
}
