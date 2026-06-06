/** Tiny className joiner — drops falsy values. No dep needed for our use. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
