import { beforeEach, describe, it, expect, vi } from "vitest";
import {
  THEME_STORAGE_KEY,
  THEME_INIT_SCRIPT,
  getStoredTheme,
  systemTheme,
  resolveInitialTheme,
  applyTheme,
  setTheme,
} from "./theme";

function stubMatchMedia(prefersDark: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: prefersDark,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  stubMatchMedia(false);
});

describe("theme helpers", () => {
  it("getStoredTheme: null when empty, value when valid, null when garbage", () => {
    expect(getStoredTheme()).toBeNull();
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    expect(getStoredTheme()).toBe("dark");
    localStorage.setItem(THEME_STORAGE_KEY, "purple");
    expect(getStoredTheme()).toBeNull();
  });

  it("systemTheme: follows prefers-color-scheme", () => {
    stubMatchMedia(true);
    expect(systemTheme()).toBe("dark");
    stubMatchMedia(false);
    expect(systemTheme()).toBe("light");
  });

  it("resolveInitialTheme: stored wins over system", () => {
    stubMatchMedia(true); // system = dark
    expect(resolveInitialTheme()).toBe("dark"); // no stored -> system
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    expect(resolveInitialTheme()).toBe("light"); // stored overrides
  });

  it("applyTheme: sets data-theme without persisting", () => {
    applyTheme("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it("setTheme: applies AND persists", () => {
    setTheme("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    setTheme("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("THEME_INIT_SCRIPT: references the key and sets data-theme", () => {
    expect(THEME_INIT_SCRIPT).toContain(THEME_STORAGE_KEY);
    expect(THEME_INIT_SCRIPT).toContain("data-theme");
    // executable without throwing
    expect(() => new Function(THEME_INIT_SCRIPT)()).not.toThrow();
  });
});
