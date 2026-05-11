/**
 * Remotion config — points the CLI at our `remotion/index.ts`
 * entry, picks codec / output defaults aligned with the existing
 * compose pipeline (h264 mp4 @ 30fps).
 *
 * The webpack override teaches Remotion's bundler the `@/` path
 * alias that Next.js's tsconfig defines, so the compositions can
 * pull `@/lib/motion-categories` without going through relative
 * paths into the Next app tree.
 */
import path from "node:path";
import { Config } from "@remotion/cli/config";

Config.setEntryPoint("./remotion/index.ts");
Config.setVideoImageFormat("jpeg");
Config.setCodec("h264");
Config.setPixelFormat("yuv420p");
Config.setConcurrency(4);
Config.overrideWebpackConfig((c) => ({
  ...c,
  resolve: {
    ...c.resolve,
    alias: {
      ...(c.resolve?.alias ?? {}),
      // `process.cwd()` resolves to the project root when running
      // `npx remotion`, while `__dirname` inside this config file
      // gets rewritten by Remotion's bundler to point inside its
      // own dist/, which would mis-resolve the alias.
      "@": path.resolve(process.cwd(), "src"),
    },
  },
}));
