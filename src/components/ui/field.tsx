import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";

/**
 * Input — token-styled text input (Design System .field input).
 * Focus shows the accent border + --ring.
 */
export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "w-full border border-line rounded-md px-3 py-[10px] text-sm bg-bg-sunken text-ink",
        "placeholder:text-faint outline-0 transition-[border-color,box-shadow] duration-150",
        "focus:border-accent focus:[box-shadow:var(--ring)]",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Field — label + control stack (.field). Associates the label to the
 * input via a generated id so clicking the label focuses the field.
 */
export interface FieldProps {
  label: ReactNode;
  htmlFor?: string;
  className?: string;
  children: (id: string) => ReactNode;
}

export function Field({ label, htmlFor, className, children }: FieldProps) {
  const generated = useId();
  const id = htmlFor ?? generated;
  return (
    <div className={cn("grid gap-[6px]", className)}>
      <label htmlFor={id} className="text-xs font-medium text-muted">
        {label}
      </label>
      {children(id)}
    </div>
  );
}
