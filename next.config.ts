import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output : Next.js bundles its server.js + only the
  // necessary node_modules into `.next/standalone/`. Tauri's sidecar
  // launches that bundle as a Node child process so the desktop
  // build doesn't need a full node_modules tree at runtime.
  output: "standalone",
};

export default nextConfig;
