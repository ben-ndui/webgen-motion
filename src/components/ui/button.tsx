import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

/**
 * Button — ported from the Design System page (.btn family).
 * Variants: primary (accent), ink (solid near-black), ghost (outlined),
 * soft (subtle fill). Sizes: md (default), lg.
 */
export type ButtonVariant = "primary" | "ink" | "ghost" | "soft";
export type ButtonSize = "md" | "lg";

const base =
  "ring-token inline-flex items-center justify-center gap-[9px] font-medium tracking-[-0.01em] rounded-md border border-transparent cursor-pointer whitespace-nowrap transition-[background-color,color,border-color,box-shadow,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:flex-none";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-ink shadow-sm hover:bg-accent-hover hover:shadow-md",
  ink: "bg-ink text-bg hover:opacity-90",
  ghost: "bg-surface text-ink border-line-strong hover:bg-surface-2",
  soft: "bg-surface-2 text-ink border-line hover:bg-bg-sunken",
};

const sizes: Record<ButtonSize, string> = {
  md: "px-[18px] py-[11px] text-sm",
  lg: "px-6 py-[14px] text-base",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  block = false,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(base, variants[variant], sizes[size], block && "w-full", className)}
      {...props}
    />
  );
}
