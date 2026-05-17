#!/usr/bin/env node
/**
 * Fetches the platform-specific Node + ffmpeg binaries that Tauri
 * bundles as sidecars. Drops them at `src-tauri/binaries/<name>-<triple>`
 * with the executable bit set, matching Tauri's `externalBin` contract.
 *
 * Triples per Tauri convention :
 *   aarch64-apple-darwin    macOS Apple Silicon
 *   x86_64-apple-darwin     macOS Intel
 *   x86_64-pc-windows-msvc  Windows
 *   x86_64-unknown-linux-gnu Linux
 *
 * By default fetches for the current host. Pass `--all` to fetch
 * every supported triple (useful in CI matrix where one job builds
 * for multiple targets, though our workflow runs one job per OS).
 *
 * Safe to run multiple times — re-uses cached downloads in
 * `src-tauri/binaries/.cache/`.
 */
import { execSync, spawnSync } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, statSync } from "node:fs";
import { chmod, copyFile, mkdtemp, rm, readdir, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const NODE_VERSION = "v22.20.0";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const binariesDir = join(repoRoot, "src-tauri", "binaries");
const cacheDir = join(binariesDir, ".cache");
mkdirSync(cacheDir, { recursive: true });

const allTriples = [
  "aarch64-apple-darwin",
  "x86_64-apple-darwin",
  "x86_64-pc-windows-msvc",
  "x86_64-unknown-linux-gnu",
];

function detectHostTriple() {
  const platform = process.platform;
  const arch = process.arch;
  if (platform === "darwin") {
    return arch === "arm64"
      ? "aarch64-apple-darwin"
      : "x86_64-apple-darwin";
  }
  if (platform === "win32") return "x86_64-pc-windows-msvc";
  if (platform === "linux") return "x86_64-unknown-linux-gnu";
  throw new Error(`Unsupported host platform : ${platform}/${arch}`);
}

const fetchAll = process.argv.includes("--all");
const triples = fetchAll ? allTriples : [detectHostTriple()];

console.log(
  `▶ desktop-fetch-binaries : ${triples.join(", ")} (node ${NODE_VERSION})`,
);

// ─── Node URLs per triple ──────────────────────────────────────────
function nodeUrlFor(triple) {
  const ver = NODE_VERSION;
  switch (triple) {
    case "aarch64-apple-darwin":
      return {
        url: `https://nodejs.org/dist/${ver}/node-${ver}-darwin-arm64.tar.gz`,
        archive: "tar.gz",
        extractPath: `node-${ver}-darwin-arm64/bin/node`,
      };
    case "x86_64-apple-darwin":
      return {
        url: `https://nodejs.org/dist/${ver}/node-${ver}-darwin-x64.tar.gz`,
        archive: "tar.gz",
        extractPath: `node-${ver}-darwin-x64/bin/node`,
      };
    case "x86_64-unknown-linux-gnu":
      return {
        url: `https://nodejs.org/dist/${ver}/node-${ver}-linux-x64.tar.xz`,
        archive: "tar.xz",
        extractPath: `node-${ver}-linux-x64/bin/node`,
      };
    case "x86_64-pc-windows-msvc":
      return {
        url: `https://nodejs.org/dist/${ver}/node-${ver}-win-x64.zip`,
        archive: "zip",
        extractPath: `node-${ver}-win-x64/node.exe`,
      };
    default:
      throw new Error(`No Node URL for ${triple}`);
  }
}

// ─── ffmpeg URLs per triple ────────────────────────────────────────
// Static builds. macOS via evermeet, Linux via johnvansickle,
// Windows via BtbN's release archive (gyan.dev redirects + tarballs
// are messier to parse).
function ffmpegUrlFor(triple) {
  switch (triple) {
    case "aarch64-apple-darwin":
      return {
        url: "https://evermeet.cx/ffmpeg/getrelease/zip",
        archive: "zip",
        extractPath: "ffmpeg",
      };
    case "x86_64-apple-darwin":
      return {
        url: "https://evermeet.cx/ffmpeg/getrelease/zip",
        archive: "zip",
        extractPath: "ffmpeg",
      };
    case "x86_64-unknown-linux-gnu":
      return {
        url: "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz",
        archive: "tar.xz",
        // The tarball expands to ffmpeg-X.Y-amd64-static/ffmpeg — we
        // glob the first matching subdir below.
        extractPath: "ffmpeg-*-amd64-static/ffmpeg",
      };
    case "x86_64-pc-windows-msvc":
      return {
        url: "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip",
        archive: "zip",
        extractPath: "ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe",
      };
    default:
      throw new Error(`No ffmpeg URL for ${triple}`);
  }
}

// ─── ffprobe URLs per triple ───────────────────────────────────────
// Same vendors as ffmpeg — bundled separately because evermeet ships
// ffmpeg as a single binary (no ffprobe symlink), and we need ffprobe
// to read media durations in compose-tour + analyze-audio.
function ffprobeUrlFor(triple) {
  switch (triple) {
    case "aarch64-apple-darwin":
    case "x86_64-apple-darwin":
      return {
        url: "https://evermeet.cx/ffmpeg/getrelease/ffprobe/zip",
        archive: "zip",
        extractPath: "ffprobe",
      };
    case "x86_64-unknown-linux-gnu":
      return {
        // johnvansickle ships ffprobe alongside ffmpeg in the same
        // tarball — same archive, different inner path.
        url: "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz",
        archive: "tar.xz",
        extractPath: "ffmpeg-*-amd64-static/ffprobe",
      };
    case "x86_64-pc-windows-msvc":
      return {
        url: "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip",
        archive: "zip",
        extractPath: "ffmpeg-master-latest-win64-gpl/bin/ffprobe.exe",
      };
    default:
      throw new Error(`No ffprobe URL for ${triple}`);
  }
}

async function download(url, dst) {
  if (existsSync(dst) && statSync(dst).size > 0) {
    console.log(`  cached : ${dst.split("/").slice(-2).join("/")}`);
    return;
  }
  console.log(`  fetch  : ${url}`);
  // Use curl — every platform has it, and following redirects is
  // simpler than crafting node:https with retries.
  const res = spawnSync(
    "curl",
    ["-L", "--fail", "--silent", "--show-error", "-o", dst, url],
    { stdio: "inherit" },
  );
  if (res.status !== 0) {
    throw new Error(`curl failed for ${url} (exit ${res.status})`);
  }
}

async function extractAndPlace({
  triple,
  archivePath,
  archiveFormat,
  innerPath,
  finalName,
}) {
  const finalPath = join(binariesDir, finalName);
  const tmp = await mkdtemp(join(tmpdir(), "wm-extract-"));
  try {
    if (archiveFormat === "tar.gz") {
      execSync(`tar -xzf "${archivePath}" -C "${tmp}"`, { stdio: "inherit" });
    } else if (archiveFormat === "tar.xz") {
      execSync(`tar -xJf "${archivePath}" -C "${tmp}"`, { stdio: "inherit" });
    } else if (archiveFormat === "zip") {
      execSync(`unzip -qo "${archivePath}" -d "${tmp}"`, { stdio: "inherit" });
    } else {
      throw new Error(`Unsupported archive format : ${archiveFormat}`);
    }
    // Resolve innerPath — supports glob "*" segments for tarballs
    // whose top dir name includes a version (ffmpeg-X.Y-amd64-static).
    let inner = join(tmp, innerPath);
    if (innerPath.includes("*")) {
      const entries = await readdir(tmp);
      const matched = entries.find((e) =>
        new RegExp("^" + innerPath.split("/")[0].replace("*", ".*") + "$").test(e),
      );
      if (!matched) throw new Error(`No tarball subdir matched ${innerPath}`);
      inner = join(tmp, matched, ...innerPath.split("/").slice(1));
    }
    if (!existsSync(inner)) {
      throw new Error(`Inner binary not found at ${inner}`);
    }
    // Windows GitHub runner mounts the temp dir on C:\ and the workspace
    // on D:\ → `rename` cross-device fails with EXDEV. Use copyFile +
    // unlink as a portable fallback that works partition-cross.
    await copyFile(inner, finalPath);
    await unlink(inner);
    await chmod(finalPath, 0o755);
    console.log(`  ✓ ${finalName} (${triple})`);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

async function fetchOne(triple, name, urlFn) {
  const { url, archive, extractPath } = urlFn(triple);
  const safeUrl = url.split("?")[0].split("/").pop() || `${name}-${triple}`;
  const archivePath = join(cacheDir, `${name}-${triple}-${safeUrl}`);
  await download(url, archivePath);
  const finalName = triple.includes("windows")
    ? `${name}-${triple}.exe`
    : `${name}-${triple}`;
  await extractAndPlace({
    triple,
    archivePath,
    archiveFormat: archive,
    innerPath: extractPath,
    finalName,
  });
}

for (const triple of triples) {
  console.log(`\n— ${triple}`);
  await fetchOne(triple, "node", nodeUrlFor);
  await fetchOne(triple, "ffmpeg", ffmpegUrlFor);
  await fetchOne(triple, "ffprobe", ffprobeUrlFor);
}

console.log("\n✓ done");
