import { execFileSync } from "node:child_process";
import { platform as osPlatform } from "node:os";

/**
 * Détection des outils de capture mobile native (B mobile onboarding).
 *
 * Sert à 2 choses :
 *  - guider l'utilisateur (message clair « installe X » au lieu d'un échec
 *    cryptique au clic Capturer) ;
 *  - savoir quelles plateformes (iOS / Android) sont prêtes.
 *
 * Ordre de résolution de chaque binaire : env `WEBGEN_*_BIN` (chemin
 * bundlé, posé par le shell Tauri) > PATH système. Cohérent avec
 * scripts/capture-mobile.ts.
 */
export interface ToolStatus {
  present: boolean;
  /** Chemin/commande résolu si présent. */
  bin?: string;
  /** 1ʳᵉ ligne de version si disponible (UX). */
  version?: string;
  /** Source : bundlé (env) ou système (PATH). */
  source?: "bundled" | "system";
}

export interface MobileToolsStatus {
  os: NodeJS.Platform;
  /** Pilote l'app (tap/swipe/inputText) — requis pour iOS ET Android. */
  maestro: ToolStatus;
  /** Maestro tourne sur la JVM. */
  java: ToolStatus;
  /** Android : enregistrement écran + pull du fichier. */
  adb: ToolStatus;
  /** iOS : enregistrement du simulateur (macOS only). */
  simctl: ToolStatus;
  /** Plateformes prêtes (outils minimaux présents). */
  platforms: { ios: boolean; android: boolean };
}

function probe(
  envVar: string | undefined,
  fallback: string,
  versionArgs: string[],
): ToolStatus {
  const fromEnv = process.env[envVar ?? ""]?.trim();
  const bin = fromEnv || fallback;
  try {
    const out = execFileSync(bin, versionArgs, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 4000,
    });
    return {
      present: true,
      bin,
      version: (out || "").split("\n")[0]?.trim() || undefined,
      source: fromEnv ? "bundled" : "system",
    };
  } catch {
    return { present: false };
  }
}

export function detectMobileTools(): MobileToolsStatus {
  const os = osPlatform();
  const maestro = probe("WEBGEN_MAESTRO_BIN", "maestro", ["--version"]);
  const java = probe("WEBGEN_JAVA_BIN", "java", ["-version"]);
  const adb = probe("WEBGEN_ADB_BIN", "adb", ["version"]);
  // simctl n'existe que sur macOS, via xcrun.
  const simctl =
    os === "darwin"
      ? probe(undefined, "xcrun", ["simctl", "help"])
      : { present: false };

  return {
    os,
    maestro,
    java,
    adb,
    simctl,
    platforms: {
      // Maestro a besoin de la JVM ; iOS a besoin de simctl (macOS).
      ios: maestro.present && simctl.present,
      android: maestro.present && adb.present,
    },
  };
}
