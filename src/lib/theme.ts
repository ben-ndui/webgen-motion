/**
 * Theme runtime — Phase 2 design portage.
 *
 * The design tokens (globals.css) re-theme under [data-theme="dark"] on
 * <html>. These pure helpers read/persist the choice (localStorage key
 * `gm-theme`, matching the handoff) and apply it to the document. Kept
 * framework-agnostic so they're unit-testable without React.
 */
export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "gm-theme";

/** Stored choice, or null if absent/invalid. */
export function getStoredTheme(): Theme | null {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

/** OS preference, defaulting to light when unavailable. */
export function systemTheme(): Theme {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}

/** Stored choice if any, else the OS preference. */
export function resolveInitialTheme(): Theme {
  return getStoredTheme() ?? systemTheme();
}

/** Reflect a theme on <html> without persisting. */
export function applyTheme(theme: Theme): void {
  try {
    document.documentElement.setAttribute("data-theme", theme);
  } catch {
    /* no document (SSR) */
  }
}

/** Apply + persist a theme. */
export function setTheme(theme: Theme): void {
  applyTheme(theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* storage unavailable */
  }
}

/**
 * Inline pre-paint snippet for the document <head> — sets data-theme
 * before first paint to avoid a flash of the wrong theme (FOUC).
 * Stringified IIFE; keep dependency-free.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k="${THEME_STORAGE_KEY}";var t=localStorage.getItem(k);if(t!=="light"&&t!=="dark"){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;
