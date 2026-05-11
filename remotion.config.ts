/**
 * Remotion config — points the CLI at our `remotion/index.ts`
 * entry, picks codec / output defaults aligned with the existing
 * compose pipeline (h264 mp4 @ 30fps).
 */
import { Config } from "@remotion/cli/config";

Config.setEntryPoint("./remotion/index.ts");
Config.setVideoImageFormat("jpeg");
Config.setCodec("h264");
Config.setPixelFormat("yuv420p");
Config.setConcurrency(4);
