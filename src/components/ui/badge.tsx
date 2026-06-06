import type { HTMLAttributes } from "react";
import { cn } from "./cn";

/**
 * Badge — mono uppercase pill (Design System .badge).
 * Tones: default (outline), acc (accent soft), ink (solid).
 */
export type BadgeTone = "default" | "acc" | "ink";

const tones: Record<BadgeTone, string> = {
  default: "border-line text-muted",
  acc: "bg-accent-soft text-accent border-accent-line",
  ink: "bg-ink text-bg border-ink",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ tone = "default", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-mono text-[10px] tracking-[0.04em] uppercase px-[9px] py-1 rounded-full border",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
