import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

/**
 * Test runner for GEN MOTION (webgen-motion).
 * jsdom + React Testing Library for component tests ; the `@/` alias
 * mirrors tsconfig so imports match the app. Tests live next to code
 * as .test / .spec files under src.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": resolve(__dirname, "src") },
  },
});
