import { execFileSync, execSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  rmSync,
  cpSync,
  readdirSync,
  chmodSync,
} from "node:fs";
import { homedir, tmpdir, platform as osPlatform, arch as osArch } from "node:os";
import { join } from "node:path";

/**
 * Installation **à la demande** des outils de capture mobile lourds
 * (Maestro + JRE) — au lieu de les embarquer dans le .dmg (~500 Mo). Même
 * philosophie que le résolveur Chromium : env > cache app > système, et
 * on télécharge dans le cache app au 1er besoin.
 *
 * Cache : `~/.webgen-motion/mobile-tools/{maestro,jre}`.
 * adb, lui, est bundlé en sidecar (petit) → WEBGEN_ADB_BIN.
 */
export function getMobileToolsDir(): string {
  return join(homedir(), ".webgen-motion", "mobile-tools");
}

function cachedMaestro(): string | null {
  const p = join(getMobileToolsDir(), "maestro", "bin", "maestro");
  return existsSync(p) ? p : null;
}
function cachedJavaHome(): string | null {
  const home = join(getMobileToolsDir(), "jre");
  return existsSync(join(home, "bin", "java")) ? home : null;
}

/** Maestro : env > cache app > système (PATH). `null` si introuvable. */
export function resolveMaestro(): { bin: string; source: "env" | "cache" | "system" } | null {
  const env = process.env.WEBGEN_MAESTRO_BIN?.trim();
  if (env && existsSync(env)) return { bin: env, source: "env" };
  const cached = cachedMaestro();
  if (cached) return { bin: cached, source: "cache" };
  try {
    execFileSync("maestro", ["--version"], { stdio: "ignore", timeout: 4000 });
    return { bin: "maestro", source: "system" };
  } catch {
    return null;
  }
}

/** JAVA_HOME : env > cache app. `null` → laisser Maestro chercher le java système. */
export function resolveJavaHome(): string | null {
  const env = process.env.JAVA_HOME?.trim();
  if (env && existsSync(join(env, "bin", "java"))) return env;
  return cachedJavaHome();
}

/** True si Maestro est déjà disponible (quelque part). */
export function maestroAvailable(): boolean {
  return resolveMaestro() !== null;
}

function dl(url: string, dst: string) {
  const r = spawnSync(
    "curl",
    ["-L", "--fail", "--silent", "--show-error", "-o", dst, url],
    { stdio: ["ignore", "ignore", "pipe"], encoding: "utf-8" },
  );
  if (r.status !== 0) throw new Error(`download échoué : ${url} — ${r.stderr}`);
}

/**
 * Télécharge + installe Maestro et un JRE dans le cache app, s'ils ne sont
 * pas déjà disponibles. Idempotent. Retourne les chemins résolus.
 */
export async function ensureMobileTools(
  log: (m: string) => void = () => {},
): Promise<{ maestro: string; javaHome: string | null }> {
  const os = osPlatform();
  if (os !== "darwin" && os !== "linux") {
    throw new Error(`Installation auto non supportée sur ${os}`);
  }
  const arch = osArch() === "arm64" ? "aarch64" : "x64";
  const dir = getMobileToolsDir();
  mkdirSync(dir, { recursive: true });

  // ── JRE (requis par Maestro) ──
  let javaHome = resolveJavaHome();
  if (!javaHome) {
    log("Téléchargement du JRE (≈ 45 Mo)…");
    const adoptOs = os === "darwin" ? "mac" : "linux";
    const url = `https://api.adoptium.net/v3/binary/latest/21/ga/${adoptOs}/${arch}/jre/hotspot/normal/eclipse?project=jdk`;
    const tar = join(tmpdir(), "wm-jre.tar.gz");
    dl(url, tar);
    log("Extraction du JRE…");
    const tmp = join(tmpdir(), "wm-jre-x");
    rmSync(tmp, { recursive: true, force: true });
    mkdirSync(tmp, { recursive: true });
    execSync(`tar -xzf "${tar}" -C "${tmp}"`);
    const top = readdirSync(tmp).find((e) => /jdk|jre/i.test(e));
    if (!top) throw new Error("JRE introuvable dans l'archive");
    const home = os === "darwin" ? join(tmp, top, "Contents", "Home") : join(tmp, top);
    const out = join(dir, "jre");
    rmSync(out, { recursive: true, force: true });
    cpSync(home, out, { recursive: true });
    chmodSync(join(out, "bin", "java"), 0o755);
    javaHome = out;
    rmSync(tmp, { recursive: true, force: true });
  }

  // ── Maestro ──
  let m = resolveMaestro();
  if (!m) {
    log("Téléchargement de Maestro (≈ 350 Mo)…");
    const url =
      "https://github.com/mobile-dev-inc/maestro/releases/latest/download/maestro.zip";
    const zip = join(tmpdir(), "wm-maestro.zip");
    dl(url, zip);
    log("Extraction de Maestro…");
    const tmp = join(tmpdir(), "wm-maestro-x");
    rmSync(tmp, { recursive: true, force: true });
    mkdirSync(tmp, { recursive: true });
    execSync(`unzip -qo "${zip}" -d "${tmp}"`);
    const src = join(tmp, "maestro");
    if (!existsSync(src)) throw new Error("maestro/ introuvable dans l'archive");
    const out = join(dir, "maestro");
    rmSync(out, { recursive: true, force: true });
    cpSync(src, out, { recursive: true });
    chmodSync(join(out, "bin", "maestro"), 0o755);
    rmSync(tmp, { recursive: true, force: true });
    m = resolveMaestro();
  }

  if (!m) throw new Error("Maestro indisponible après installation");
  log("✓ Outils mobiles prêts.");
  return { maestro: m.bin, javaHome };
}
