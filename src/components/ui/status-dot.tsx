import type { HTMLAttributes } from "react";
import { cn } from "./cn";

/**
 * StatusDot — labelled status with a colored dot (hub.css .status).
 * draft = muted/grey · ready = accent · rendered = ink.
 */
export type Status = "draft" | "ready" | "rendered";

const tones: Record<Status, { text: string; dot: string }> = {
  draft: { text: "text-muted", dot: "bg-line-strong" },
  ready: { text: "text-accent", dot: "bg-accent" },
  rendered: { text: "text-ink", dot: "bg-ink" },
};

export interface StatusDotProps extends HTMLAttributes<HTMLSpanElement> {
  status: Status;
}

export function StatusDot({ status, className, children, ...props }: StatusDotProps) {
  const t = tones[status];
  return (
    <span
      className={cn("inline-flex items-center gap-[7px] text-xs font-medium whitespace-nowrap", t.text, className)}
      {...props}
    >
      <span className={cn("h-[7px] w-[7px] rounded-full flex-none", t.dot)} aria-hidden />
      {children}
    </span>
  );
}
