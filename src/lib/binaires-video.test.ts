import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

import { ffmpeg, ffprobe } from "./binaires-video";

function fichiersDeCode(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) return fichiersDeCode(chemin);
    return /\.(ts|tsx|mjs)$/.test(nom) && !/\.test(-utils)?\.|test-utils/.test(nom) ? [chemin] : [];
  });
}

describe("binaires vidéo", () => {
  it("prend ceux de l'app quand elle les donne, ceux du système sinon", () => {
    const avant = { m: process.env.WEBGEN_FFMPEG_BIN, p: process.env.WEBGEN_FFPROBE_BIN };
    try {
      delete process.env.WEBGEN_FFMPEG_BIN;
      delete process.env.WEBGEN_FFPROBE_BIN;
      expect([ffmpeg(), ffprobe()]).toEqual(["ffmpeg", "ffprobe"]);
      process.env.WEBGEN_FFMPEG_BIN = "/App/Contents/MacOS/ffmpeg";
      process.env.WEBGEN_FFPROBE_BIN = "/App/Contents/MacOS/ffprobe";
      expect([ffmpeg(), ffprobe()]).toEqual(["/App/Contents/MacOS/ffmpeg", "/App/Contents/MacOS/ffprobe"]);
    } finally {
      process.env.WEBGEN_FFMPEG_BIN = avant.m;
      process.env.WEBGEN_FFPROBE_BIN = avant.p;
      if (avant.m === undefined) delete process.env.WEBGEN_FFMPEG_BIN;
      if (avant.p === undefined) delete process.env.WEBGEN_FFPROBE_BIN;
    }
  });

  // Garde : un ffmpeg lancé par son seul nom marche en dev et casse dans l'app installée.
  it("aucun code serveur ne lance ffmpeg ou ffprobe par son seul nom", () => {
    const racine = join(__dirname, "..");
    const fautifs = fichiersDeCode(racine).filter((chemin) =>
      /(spawn|spawnSync|execFile|execFileSync)\(\s*["'](ffmpeg|ffprobe)["']/.test(readFileSync(chemin, "utf-8")),
    );
    expect(fautifs.map((chemin) => relative(racine, chemin))).toEqual([]);
  });
});
