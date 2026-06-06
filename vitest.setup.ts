import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// jsdom lacks these — provide inert stubs so components that touch them
// (theme toggle, landing reveal/observer) render in tests.
if (!("matchMedia" in window)) {
  // assigned per-test where the value matters; default = light.
}
window.matchMedia ||= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;

class IO {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
// @ts-expect-error — minimal stub for tests
globalThis.IntersectionObserver ||= IO;
