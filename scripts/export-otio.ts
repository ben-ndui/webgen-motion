#!/usr/bin/env node
/**
 * Sprint E — CLI export OpenTimelineIO (Studio Edition).
 *
 * Génère `<tourDir>/<tourId>.otio` : la timeline du tour (sections
 * découpées par l'Edit Engine, voix off segmentée, musique) prête à
 * être importée dans DaVinci Resolve (File → Import Timeline) ou
 * Premiere Pro (File → Import).
 *
 * Usage:
 *   npx tsx scripts/export-otio.ts \
 *     --tour-id uzme-landing \
 *     --tour-dir ~/.webgen-motion/tours/uzme-landing \
 *     [--bg-music <path>]
 *
 * Gated Studio Edition (flag `otio-export`). En dev :
 *   WEBGEN_MOTION_EDITION=studio npx tsx scripts/export-otio.ts …
 */

import { existsSync } from "node:fs";
import { getTour } from "../src/lib/tour-loader";
import { isFeatureEnabled } from "../src/lib/edition";
import { exportTourOtio } from "../src/lib/otio/export-otio";

function arg(flag: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i === -1) return fallback;
  return process.argv[i + 1];
}

const tourId = arg("--tour-id");
const tourDir = arg("--tour-dir");
const bgMusic = arg("--bg-music");

if (!tourId || !tourDir) {
  console.error("Usage: export-otio.ts --tour-id <id> --tour-dir <path> [--bg-music <path>]");
  process.exit(1);
}
if (!existsSync(tourDir)) {
  console.error(`Tour dir introuvable : ${tourDir}`);
  process.exit(1);
}
if (!isFeatureEnabled("otio-export")) {
  console.error(
    "L'export OTIO est une feature Studio Edition. Active ta license (.license) ou, en dev : WEBGEN_MOTION_EDITION=studio",
  );
  process.exit(1);
}

const tour = getTour(tourId);
const result = exportTourOtio({
  tourId,
  tourDir,
  tourName: tour?.name,
  ...(bgMusic !== undefined ? { bgMusicPath: bgMusic } : {}),
});

console.log(`▶ Export OTIO : ${result.timelineName}`);
console.log(`  Sections   : ${result.sections}`);
console.log(`  Segments VO: ${result.voSegments}`);
console.log(`  Musique    : ${result.hasMusic ? "oui" : "—"}`);
console.log(`✓ ${result.otioPath}`);
console.log(`  → DaVinci Resolve : File → Import Timeline → ${result.otioPath.split("/").pop()}`);
console.log(`  → Premiere Pro    : File → Import`);
