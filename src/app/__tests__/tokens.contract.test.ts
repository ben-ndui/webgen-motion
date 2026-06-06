import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

/**
 * Token contract — Phase 1 design portage guardrail.
 *
 * globals.css is the single source of truth for the GEN MOTION design
 * tokens (handoff: design_handoff_genmotion/assets/tokens.css). This test
 * fails loudly if a future edit drops a token, the dark re-theme, the
 * Tailwind @theme mapping, or the data-theme variant — so the design
 * system can't silently rot during the surface-by-surface migration.
 */
const css = readFileSync(
  resolve(__dirname, "../globals.css"),
  "utf-8",
);

// Strip CSS comments so we assert on real declarations only.
const code = css.replace(/\/\*[\s\S]*?\*\//g, "");

describe("globals.css — design token contract", () => {
  it("declares the Tailwind layer + dark variant on [data-theme]", () => {
    expect(code).toContain('@import "tailwindcss"');
    expect(code).toMatch(/@custom-variant\s+dark\s*\(/);
    expect(code).toContain('[data-theme="dark"]');
  });

  const lightTokens = [
    "--bg",
    "--bg-sunken",
    "--surface",
    "--surface-2",
    "--ink",
    "--ink-soft",
    "--muted",
    "--faint",
    "--line",
    "--line-soft",
    "--line-strong",
    "--accent-h",
    "--accent",
    "--accent-hover",
    "--accent-ink",
    "--accent-soft",
  ];
  it.each(lightTokens)("defines light token %s", (token) => {
    // token followed by a colon (value assignment), not just referenced
    expect(code).toMatch(new RegExp(`\\${token}\\s*:`));
  });

  it("defines the spacing scale --s-1..--s-11 (used by ported landing/hub CSS)", () => {
    for (let i = 1; i <= 11; i++) {
      expect(code).toMatch(new RegExp(`--s-${i}\\s*:`));
    }
  });

  it("defines layout + radius tokens consumed by ported CSS", () => {
    for (const t of ["--maxw", "--nav-h", "--r-md", "--r-lg", "--r-xl", "--motion"]) {
      expect(code).toMatch(new RegExp(`\\${t}\\s*:`));
    }
  });

  it("uses OKLCH for the palette (not hex/slate)", () => {
    expect(code).toMatch(/--bg\s*:\s*oklch\(/);
    expect(code).toMatch(/--accent\s*:\s*oklch\(/);
  });

  it("re-themes core tokens under [data-theme='dark']", () => {
    const dark = code.slice(code.indexOf('[data-theme="dark"]'));
    for (const t of ["--bg", "--ink", "--line", "--accent"]) {
      expect(dark).toMatch(new RegExp(`\\${t}\\s*:`));
    }
  });

  const themeMappings = [
    "--color-bg",
    "--color-ink",
    "--color-muted",
    "--color-faint",
    "--color-line",
    "--color-surface",
    "--color-accent",
    "--text-display",
    "--radius-xl",
    "--shadow-pop",
    "--font-sans",
    "--font-mono",
  ];
  it.each(themeMappings)("maps %s into @theme inline", (token) => {
    expect(code).toMatch(new RegExp(`\\${token}\\s*:`));
  });

  it("keeps legacy aliases so un-migrated components don't break", () => {
    for (const alias of ["--background", "--foreground", "--border", "--text-muted"]) {
      expect(code).toMatch(new RegExp(`\\${alias}\\s*:`));
    }
  });
});
