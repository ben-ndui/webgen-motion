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

/** Un device/simulateur connecté et prêt à être filmé. */
export interface ConnectedDevice {
  platform: "ios" | "android";
  id: string;
  name: string;
  kind: "device" | "simulator" | "emulator";
}

/**
 * Liste les devices actuellement connectés/bootés (poll côté dashboard) :
 *  - Android via `adb devices -l` (devices physiques + émulateurs)
 *  - iOS via `xcrun simctl list devices booted -j` (simulateurs bootés)
 * Best-effort : un outil absent → rien pour cette plateforme.
 */
export function detectDevices(): ConnectedDevice[] {
  const out: ConnectedDevice[] = [];

  // Android
  const adbBin = process.env.WEBGEN_ADB_BIN?.trim() || "adb";
  try {
    const txt = execFileSync(adbBin, ["devices", "-l"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 4000,
    });
    for (const line of txt.split("\n").slice(1)) {
      const m = line.match(/^(\S+)\s+device\b(.*)$/);
      if (!m) continue;
      const id = m[1];
      const model = m[2].match(/model:(\S+)/)?.[1]?.replace(/_/g, " ");
      out.push({
        platform: "android",
        id,
        name: model || id,
        kind: id.startsWith("emulator-") ? "emulator" : "device",
      });
    }
  } catch {
    /* adb absent / pas de device */
  }

  // iOS (simulateurs bootés, macOS only)
  if (osPlatform() === "darwin") {
    try {
      const json = execFileSync(
        "xcrun",
        ["simctl", "list", "devices", "booted", "-j"],
        { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"], timeout: 4000 },
      );
      const data = JSON.parse(json) as {
        devices?: Record<string, Array<{ udid: string; name: string; state: string }>>;
      };
      for (const list of Object.values(data.devices ?? {})) {
        for (const d of list) {
          if (d.state === "Booted") {
            out.push({ platform: "ios", id: d.udid, name: d.name, kind: "simulator" });
          }
        }
      }
    } catch {
      /* xcrun absent / pas de simulateur booté */
    }
  }

  return out;
}
