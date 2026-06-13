/**
 * Résolution unifiée du navigateur Chromium pour le pipeline.
 *
 * Deux consommateurs partagent UN SEUL binaire (pas deux téléchargements) :
 *   - Puppeteer (`capture-tour.ts`)  → option `executablePath`
 *   - Remotion  (`compose-tour.ts`)  → flag `--browser-executable`
 *
 * Ordre de résolution (`resolveChromiumExecutable`) :
 *   1. env `WEBGEN_CHROMIUM_BIN` (override explicite)
 *   2. Google Chrome / Chromium **système** détecté (fallback gratuit)
 *   3. Chrome-for-Testing déjà installé dans le cache app
 *      (`~/.webgen-motion/browsers`)
 *   → sinon `null`.
 *
 * En **dev** (`npm run dev`), si rien n'est résolu, on renvoie `null` :
 * l'appelant n'impose alors PAS d'`executablePath` et Puppeteer/Remotion
 * gardent leur comportement actuel (Chromium téléchargé par `npm install`
 * dans `~/.cache/puppeteer`). On ne casse donc pas le workflow dev.
 *
 * En **app packagée** (le cache `npm install` est absent), l'appelant
 * appelle `ensureChromium()` qui télécharge Chrome-for-Testing via
 * `@puppeteer/browsers` (vérification d'intégrité incluse) une seule fois.
 *
 * Multi-plateforme : `@puppeteer/browsers` gère macOS / Windows / Linux.
 */

import { existsSync, mkdirSync } from "node:fs";
import { homedir, platform as osPlatform } from "node:os";
import { join } from "node:path";

export type ChromiumSource = "env" | "system" | "cache";

export interface ChromiumResolution {
  path: string;
  source: ChromiumSource;
}

/** Erreur claire et actionnable pour l'UI / les logs runner. */
export class ChromiumError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChromiumError";
  }
}

/** Cache navigateur dédié à l'app (hors du cache npm). */
export function getChromiumCacheDir(): string {
  return join(homedir(), ".webgen-motion", "browsers");
}

/** Emplacements connus d'un Chrome/Chromium système, par plateforme. */
function defaultSystemCandidates(): string[] {
  switch (osPlatform()) {
    case "darwin":
      return [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
      ];
    case "win32":
      return [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      ];
    default:
      return [
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
        "/snap/bin/chromium",
      ];
  }
}

/**
 * Détecte un Chrome/Chromium système. `candidates` injectable pour les
 * tests ; par défaut, la liste par plateforme.
 */
export function detectSystemChrome(candidates?: string[]): string | null {
  for (const c of candidates ?? defaultSystemCandidates()) {
    if (c && existsSync(c)) return c;
  }
  return null;
}

/** Cherche un Chrome-for-Testing déjà installé dans le cache app. */
async function findCachedChromium(): Promise<string | null> {
  const cacheDir = getChromiumCacheDir();
  if (!existsSync(cacheDir)) return null;
  try {
    const { getInstalledBrowsers } = await import("@puppeteer/browsers");
    const installed = await getInstalledBrowsers({ cacheDir });
    const chrome = installed.find(
      (b) => String(b.browser) === "chrome" && existsSync(b.executablePath),
    );
    return chrome?.executablePath ?? null;
  } catch {
    return null;
  }
}

/**
 * Résout le chemin du navigateur à utiliser, sans rien télécharger.
 * Renvoie `null` si rien n'est disponible (→ laisser le défaut Puppeteer
 * en dev).
 */
export async function resolveChromiumExecutable(
  env: Record<string, string | undefined> = process.env,
  systemCandidates?: string[],
): Promise<ChromiumResolution | null> {
  const override = env.WEBGEN_CHROMIUM_BIN?.trim();
  if (override && existsSync(override)) {
    return { path: override, source: "env" };
  }
  const system = detectSystemChrome(systemCandidates);
  if (system) return { path: system, source: "system" };
  const cached = await findCachedChromium();
  if (cached) return { path: cached, source: "cache" };
  return null;
}

/**
 * Garantit qu'un navigateur est disponible et retourne son chemin.
 * Réutilise un binaire résolu (env/système/cache) ; sinon télécharge
 * Chrome-for-Testing dans le cache app (intégrité vérifiée par
 * `@puppeteer/browsers`). Lève `ChromiumError` avec un message
 * actionnable en cas d'échec.
 */
export async function ensureChromium(
  opts: {
    env?: Record<string, string | undefined>;
    onProgress?: (downloaded: number, total: number) => void;
    cacheDir?: string;
    /** Candidats Chrome système (injectable pour tests déterministes). */
    systemCandidates?: string[];
  } = {},
): Promise<ChromiumResolution> {
  const env = opts.env ?? process.env;
  const existing = await resolveChromiumExecutable(env, opts.systemCandidates);
  if (existing) return existing;

  const cacheDir = opts.cacheDir ?? getChromiumCacheDir();
  mkdirSync(cacheDir, { recursive: true });

  let mod: typeof import("@puppeteer/browsers");
  try {
    mod = await import("@puppeteer/browsers");
  } catch (e) {
    throw new ChromiumError(
      `Module de téléchargement indisponible (@puppeteer/browsers) : ${(e as Error).message}`,
    );
  }
  const { install, Browser, resolveBuildId, detectBrowserPlatform } = mod;

  const browserPlatform = detectBrowserPlatform();
  if (!browserPlatform) {
    throw new ChromiumError(
      "Plateforme non supportée pour le téléchargement automatique de Chromium. Installe Google Chrome puis relance.",
    );
  }

  let buildId: string;
  try {
    buildId = await resolveBuildId(Browser.CHROME, browserPlatform, "stable");
  } catch (e) {
    throw new ChromiumError(
      `Impossible de résoudre la version de Chrome à télécharger : ${(e as Error).message}`,
    );
  }

  try {
    const installed = await install({
      browser: Browser.CHROME,
      buildId,
      cacheDir,
      downloadProgressCallback: opts.onProgress,
    });
    return { path: installed.executablePath, source: "cache" };
  } catch (e) {
    throw new ChromiumError(
      `Échec du téléchargement de Chromium (${(e as Error).message}). ` +
        "Vérifie ta connexion réseau, ou installe Google Chrome puis relance.",
    );
  }
}

/**
 * Args Remotion pour pointer le MÊME binaire que Puppeteer.
 * Vide si `path` absent (→ Remotion utilise son navigateur par défaut).
 */
export function remotionBrowserArgs(path: string | null | undefined): string[] {
  return path ? [`--browser-executable=${path}`] : [];
}
