import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Pin the file-tracing root to THIS directory. Without this, Next
// detects a sibling lockfile in `$HOME/` and walks up the file system
// looking for "dependencies", producing a 2 GB standalone bundle
// full of unrelated files. Pinning here keeps it scoped to the
// repo (~100 MB instead of ~2.4 GB).
const repoRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: repoRoot,
};

export default nextConfig;
