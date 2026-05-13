/**
 * Edition / feature-flag system pour webgen-motion.
 * Sprint 6 — extraction Motion Studio standalone.
 *
 * Stratégie open-core Davinci-style (cf. mémoire de roadmap) :
 * Community Edition gratuit, Studio Edition one-time payant qui
 * unlock les features premium. Toute feature future commerciale
 * doit être gated par un `isFeatureEnabled(flag)`.
 *
 * Aujourd'hui : tout est en Community, donc isFeatureEnabled
 * renvoie true pour les features Community, false pour les flags
 * Studio. Le jour où on lance Studio, le license key local change
 * l'edition active et débloque les flags correspondants.
 *
 * Validation license : offline-first (signature crypto vérifiée
 * localement, pas d'appel serveur obligatoire — respect du
 * local-first et de la notarization Apple en mode déconnecté).
 *
 * Source de vérité de l'edition active :
 *  1. env WEBGEN_MOTION_EDITION (override pour dev/CI)
 *  2. ~/.webgen-motion/.license (futur)
 *  3. webgen-motion.config.ts root
 *  4. default "community"
 */

import type { WebgenMotionEdition } from "./webgen-motion-config-types";

/** Identifiants stables des features gated. Add new flags here
 *  whenever you ship something that might become Studio. */
export type FeatureFlag =
  // Community (toujours actifs)
  | "compose-sober"
  | "compose-energetic"
  | "format-16-9"
  | "format-9-16"
  | "agent-ia-byok"
  | "recapture-section"
  | "reorder-sections"
  | "trim-section"
  | "upload-section-mp4"
  | "scaffold-from-project"
  // Studio (gated, viendront avec leur implémentation)
  | "compose-cinematic"
  | "compose-glitch"
  | "frames-3d"
  | "multi-format-export"
  | "music-library"
  | "watermark-removal"
  | "cloud-rendering"
  | "auto-update-priority"
  // Enterprise (sur mesure)
  | "white-label"
  | "api-headless"
  | "sso";

const COMMUNITY_FLAGS: ReadonlySet<FeatureFlag> = new Set<FeatureFlag>([
  "compose-sober",
  "compose-energetic",
  "format-16-9",
  "format-9-16",
  "agent-ia-byok",
  "recapture-section",
  "reorder-sections",
  "trim-section",
  "upload-section-mp4",
  "scaffold-from-project",
]);

const STUDIO_FLAGS: ReadonlySet<FeatureFlag> = new Set<FeatureFlag>([
  ...COMMUNITY_FLAGS,
  "compose-cinematic",
  "compose-glitch",
  "frames-3d",
  "multi-format-export",
  "music-library",
  "watermark-removal",
  "cloud-rendering",
  "auto-update-priority",
]);

const ENTERPRISE_FLAGS: ReadonlySet<FeatureFlag> = new Set<FeatureFlag>([
  ...STUDIO_FLAGS,
  "white-label",
  "api-headless",
  "sso",
]);

const FLAG_SETS: Record<WebgenMotionEdition, ReadonlySet<FeatureFlag>> = {
  community: COMMUNITY_FLAGS,
  studio: STUDIO_FLAGS,
  enterprise: ENTERPRISE_FLAGS,
};

/** Cached resolved edition. Reset on next process boot. */
let cachedEdition: WebgenMotionEdition | null = null;

/** Résout l'edition active. Source de vérité :
 *  1. env WEBGEN_MOTION_EDITION (override dev/CI)
 *  2. webgen-motion.config.ts (default community)
 *  3. fallback community
 *
 *  (Le license key local sera lu ici dans une phase future.) */
export function getEdition(): WebgenMotionEdition {
  if (cachedEdition) return cachedEdition;
  const envEdition = process.env.WEBGEN_MOTION_EDITION as
    | WebgenMotionEdition
    | undefined;
  if (
    envEdition === "community" ||
    envEdition === "studio" ||
    envEdition === "enterprise"
  ) {
    cachedEdition = envEdition;
    return envEdition;
  }
  // TODO Sprint future : lire ~/.webgen-motion/.license (offline-first
  // signature check) pour autoriser studio/enterprise.
  // Pour l'instant default community.
  cachedEdition = "community";
  return "community";
}

/** Check si une feature est dispo dans l'edition active. */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const ed = getEdition();
  return FLAG_SETS[ed].has(flag);
}

/** Test-only : reset le cache. Utile pour les tests qui changent
 *  l'edition à la volée via env. */
export function resetEditionCache(): void {
  cachedEdition = null;
}
