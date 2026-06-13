#!/usr/bin/env node
/**
 * ⚠ Point d'entrée historique — la logique vit désormais dans
 * `scripts/issue-license.ts` (qui réutilise `src/lib/license/issue.ts`,
 * source unique partagée avec le fulfillment Stripe). Ce fichier ne fait
 * que déléguer, pour ne pas casser le `node scripts/issue-license.mjs`
 * documenté. Préférer : `npx tsx scripts/issue-license.ts ...`.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const r = spawnSync(
  "npx",
  ["tsx", join(here, "issue-license.ts"), ...process.argv.slice(2)],
  { stdio: "inherit" },
);
process.exit(r.status ?? 1);
