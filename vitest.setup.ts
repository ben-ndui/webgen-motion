import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// next/navigation needs the app-router context (absent under RTL). Stub it
// so client components that call useRouter() render in tests.
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: () => {},
    replace: () => {},
    refresh: () => {},
    back: () => {},
    forward: () => {},
    prefetch: () => {},
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  redirect: () => {},
  notFound: () => {},
}));

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

// Inert fetch so components that probe config on mount don't throw in jsdom.
globalThis.fetch ||= (async () =>
  new Response("{}", {
    status: 200,
    headers: { "content-type": "application/json" },
  })) as typeof fetch;
