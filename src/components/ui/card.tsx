import type { HTMLAttributes } from "react";
import { cn } from "./cn";

/**
 * Card — surface + hairline border + lg radius (editor.css .card).
 * `pad` adds the standard 24px inset (.card-pad).
 */
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  pad?: boolean;
}

export function Card({ pad = false, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-surface border border-line rounded-lg",
        pad && "p-6",
        className,
      )}
      {...props}
    />
  );
}
