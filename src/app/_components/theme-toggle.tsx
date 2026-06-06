"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { type Theme, resolveInitialTheme, setTheme } from "@/lib/theme";

/**
 * Light/dark toggle. The pre-paint script in layout.tsx already set
 * [data-theme] before hydration; here we sync local state to it, then
 * flip + persist on click. Icon shows the theme you'll switch TO.
 */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setThemeState(resolveInitialTheme());
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setThemeState(next);
  }

  const next = theme === "dark" ? "clair" : "sombre";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Passer en thème ${next}`}
      title={`Thème ${next}`}
      data-wm-id="chrome.theme-toggle"
      className={`ring-token inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-muted transition-colors hover:bg-surface-2 hover:text-ink ${className}`}
    >
      {/* Avoid hydration mismatch: render a stable icon until mounted. */}
      {mounted && theme === "dark" ? (
        <Sun className="h-4 w-4" aria-hidden />
      ) : (
        <Moon className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}
