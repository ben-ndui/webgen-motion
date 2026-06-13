import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertAbsoluteLocalPath,
  assertExistingDirectory,
  assertContainedPath,
  assertOutputDirectory,
  SafePathError,
} from "./safe-path";

let root: string;
let subdir: string;
let filePath: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "safe-path-"));
  subdir = join(root, "sub");
  mkdirSync(subdir);
  filePath = join(root, "file.txt");
  writeFileSync(filePath, "x");
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("assertAbsoluteLocalPath", () => {
  it("accepte un chemin absolu et le normalise", () => {
    expect(assertAbsoluteLocalPath("/a/b/../c", "p")).toBe("/a/c");
  });
  it("rejette les non-strings / vide", () => {
    expect(() => assertAbsoluteLocalPath(undefined, "p")).toThrow(SafePathError);
    expect(() => assertAbsoluteLocalPath("", "p")).toThrow(SafePathError);
    expect(() => assertAbsoluteLocalPath(123, "p")).toThrow(SafePathError);
  });
  it("rejette les chemins relatifs", () => {
    try {
      assertAbsoluteLocalPath("relative/path", "p");
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(SafePathError);
      expect((e as SafePathError).code).toBe("not-absolute");
    }
  });
  it("rejette un null byte (injection)", () => {
    try {
      assertAbsoluteLocalPath("/etc/passwd\0.png", "p");
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as SafePathError).code).toBe("invalid");
    }
  });
});

describe("assertExistingDirectory", () => {
  it("accepte un dossier existant", () => {
    expect(assertExistingDirectory(root, "projectPath")).toBe(root);
  });
  it("rejette un chemin introuvable", () => {
    try {
      assertExistingDirectory(join(root, "nope"), "projectPath");
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as SafePathError).code).toBe("not-found");
    }
  });
  it("rejette un fichier (pas un dossier)", () => {
    try {
      assertExistingDirectory(filePath, "projectPath");
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as SafePathError).code).toBe("not-directory");
    }
  });
});

describe("assertContainedPath", () => {
  it("accepte un descendant", () => {
    expect(assertContainedPath(subdir, root, "outDir")).toBe(subdir);
  });
  it("accepte la racine elle-même", () => {
    expect(assertContainedPath(root, root, "outDir")).toBe(root);
  });
  it("rejette un chemin qui s'échappe via ..", () => {
    try {
      assertContainedPath(join(root, "..", "elsewhere"), root, "outDir");
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as SafePathError).code).toBe("outside-root");
    }
  });
  it("rejette un préfixe trompeur (root-sibling)", () => {
    // `${root}-evil` commence par `${root}` en string mais n'est pas dedans.
    expect(() =>
      assertContainedPath(`${root}-evil`, root, "outDir"),
    ).toThrow(SafePathError);
  });
});

describe("assertOutputDirectory", () => {
  it("contraint sous root quand fourni", () => {
    expect(assertOutputDirectory(subdir, "outDir", root)).toBe(subdir);
    expect(() =>
      assertOutputDirectory("/tmp/escape", "outDir", root),
    ).toThrow(SafePathError);
  });
  it("n'exige pas l'existence (sera créé)", () => {
    const future = join(root, "to-create");
    expect(assertOutputDirectory(future, "outDir", root)).toBe(future);
  });
});
