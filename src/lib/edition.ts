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

import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { verifyLicense } from "./license/verify";
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
  | "otio-export"
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
  "otio-export",
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

/** Cached resolved edition + la "signature" du fichier .license au moment
 *  du cache. On invalide automatiquement si le fichier change (install /
 *  remove / refresh), SANS dépendre de resetEditionCache() — crucial car
 *  la route d'install et le rendu de page peuvent vivre dans des bundles /
 *  instances séparés (Next dev, serverless), où le reset d'un côté ne
 *  vide pas le cache vu de l'autre. */
let cachedResolution: EditionResolution | null = null;
let cachedKey: string | null = null;

/** Path du fichier license — `~/.webgen-motion/.license`. */
function getLicensePath(): string {
  return join(homedir(), ".webgen-motion", ".license");
}

/** Signature du fichier license (présence + mtime + taille). L'override
 *  env et la config ne changent pas à l'exécution → seul le fichier varie. */
function licenseFileKey(): string {
  try {
    const s = statSync(getLicensePath());
    return `${s.mtimeMs}:${s.size}`;
  } catch {
    return "none";
  }
}

/** Résolution complète de l'edition : edition + source + license info
 *  si applicable. Utile pour l'UI Settings qui affiche "Studio Edition
 *  · License jusqu'au X · email Y". */
export interface EditionResolution {
  edition: WebgenMotionEdition;
  source: "env" | "license" | "config" | "default";
  /** Snapshot non-sensible du payload license, présent uniquement
   *  quand source === "license". */
  license?: {
    email: string;
    issuedAt: number;
    expiresAt: number | null;
    features?: FeatureFlag[];
    note?: string;
  };
  /** Si un fichier .license existe mais est invalide, l'erreur. UI
   *  peut afficher "License expirée, contacte le support" etc. */
  licenseError?: import("./license/types").LicenseError;
}

/** Résout l'edition active. Source de vérité (ordre de priorité) :
 *  1. env WEBGEN_MOTION_EDITION (override dev/CI/CI tests)
 *  2. ~/.webgen-motion/.license (Ed25519 signed, vérifié localement)
 *  3. webgen-motion.config.ts:edition (default community)
 *  4. community fallback
 *
 *  Sprint 9 (2026-05-17) : la lecture du license file est branchée.
 *  Ben peut désormais issuer des licenses signées via
 *  scripts/issue-license.mjs et les distribuer aux clients Studio. */
export function resolveEdition(): EditionResolution {
  const key = licenseFileKey();
  if (cachedResolution && cachedKey === key) return cachedResolution;
  cachedKey = key;

  // 1. env override — DEV UNIQUEMENT. Dans l'app desktop packagée
  // (le shell Rust Tauri set WEBGEN_RUNNERS_DIR pour le sidecar),
  // l'override est ignoré : sinon n'importe qui lance l'app avec
  // WEBGEN_MOTION_EDITION=studio et débloque Studio sans license.
  // En dev / self-host depuis les sources, l'override reste utile
  // (tests CI, développement des features gated).
  const isPackagedDesktop = !!process.env.WEBGEN_RUNNERS_DIR;
  const envEdition = process.env.WEBGEN_MOTION_EDITION as
    | WebgenMotionEdition
    | undefined;
  if (
    !isPackagedDesktop &&
    (envEdition === "community" ||
      envEdition === "studio" ||
      envEdition === "enterprise")
  ) {
    cachedResolution = { edition: envEdition, source: "env" };
    return cachedResolution;
  }

  // 2. license file (signed Ed25519)
  const licensePath = getLicensePath();
  if (existsSync(licensePath)) {
    try {
      const content = readFileSync(licensePath, "utf-8");
      const result = verifyLicense(content);
      if (result.valid) {
        cachedResolution = {
          edition: result.payload.edition,
          source: "license",
          license: {
            email: result.payload.email,
            issuedAt: result.payload.issuedAt,
            expiresAt: result.payload.expiresAt,
            features: result.payload.features,
            note: result.payload.note,
          },
        };
        return cachedResolution;
      }
      console.warn(
        `[edition] license file présent mais invalide (${result.error}) → fallback community`,
      );
      cachedResolution = {
        edition: "community",
        source: "default",
        licenseError: result.error,
      };
      return cachedResolution;
    } catch (e) {
      console.warn(
        `[edition] erreur lecture ${licensePath} : ${(e as Error).message}`,
      );
    }
  }

  // 3. fallback community (config edition pas encore lu — c'est un
  // override compile-time, rare en pratique)
  cachedResolution = { edition: "community", source: "default" };
  return cachedResolution;
}

/** Raccourci : retourne juste l'edition. */
export function getEdition(): WebgenMotionEdition {
  return resolveEdition().edition;
}

/** Check si une feature est dispo dans l'edition active. */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const ed = getEdition();
  return FLAG_SETS[ed].has(flag);
}

/** Reset le cache. À appeler après un install/remove license pour
 *  que la prochaine résolution lise le nouveau .license. */
export function resetEditionCache(): void {
  cachedResolution = null;
  cachedKey = null;
}
