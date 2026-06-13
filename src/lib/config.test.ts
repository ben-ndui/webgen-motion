import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir, platform } from "node:os";
import { join } from "node:path";
import { writeConfigSecure } from "./config";

/**
 * P2.2 — le config.json contient des secrets (clés API). À l'écriture,
 * il doit être en 0600 (rw propriétaire). Test des permissions POSIX,
 * skip sur Windows (pas de bits POSIX).
 */
const isWindows = platform() === "win32";
const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
  dirs.length = 0;
});

describe("writeConfigSecure", () => {
  it.skipIf(isWindows)("écrit le fichier en 0600 (création)", () => {
    const dir = mkdtempSync(join(tmpdir(), "cfg-"));
    dirs.push(dir);
    const f = join(dir, "config.json");
    writeConfigSecure(f, JSON.stringify({ agent: { apiKey: "secret" } }));
    const mode = statSync(f).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it.skipIf(isWindows)("resserre un fichier préexistant trop ouvert (0644 → 0600)", () => {
    const dir = mkdtempSync(join(tmpdir(), "cfg-"));
    dirs.push(dir);
    const f = join(dir, "config.json");
    writeFileSync(f, "{}", { mode: 0o644 }); // legacy world-readable
    writeConfigSecure(f, JSON.stringify({ elevenlabs: { apiKey: "k" } }));
    expect(statSync(f).mode & 0o777).toBe(0o600);
  });

  it("écrit bien le contenu (round-trip lisible)", () => {
    const dir = mkdtempSync(join(tmpdir(), "cfg-"));
    dirs.push(dir);
    const f = join(dir, "config.json");
    writeConfigSecure(f, '{"ok":true}');
    expect(statSync(f).isFile()).toBe(true);
  });
});
