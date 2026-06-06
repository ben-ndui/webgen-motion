"use client";

import { cn } from "./cn";

/**
 * SegmentedControl — controlled pill switcher (Design System / hub .seg).
 * Used for format (Tous/16:9/9:16), backend (ElevenLabs/Voicebox), etc.
 */
export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  "aria-label"?: string;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onValueChange,
  className,
  ...rest
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={rest["aria-label"]}
      className={cn(
        "inline-flex bg-surface-2 border border-line rounded-md p-[3px] gap-[2px]",
        className,
      )}
    >
      {options.map((opt) => {
        const on = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onValueChange(opt.value)}
            className={cn(
              "ring-token text-xs px-3 py-[6px] rounded-[7px] cursor-pointer transition-colors duration-150",
              on ? "bg-surface text-ink shadow-xs" : "text-muted hover:text-ink",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
