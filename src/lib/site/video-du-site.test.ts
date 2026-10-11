import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { dossierJetable } from "../film-fixtures.test-utils";
import { lancerLeNavigateur } from "./navigateur-du-site";
import { DUREE_DE_LA_VIDEO, adoucir, filmerUnePage, positionsDuDefilement } from "./video-du-site";

describe("défilement filmé", () => {
  it("avance toujours, part de 0, arrive au bout, puis s'arrête", () => {
    const positions = positionsDuDefilement(1000, 240);
    expect(positions[0]).toBe(0);
    expect(positions.at(-1)).toBe(1000);
    expect(positions.every((y, i) => i === 0 || y >= positions[i - 1]!)).toBe(true);
    expect(positions.slice(180).every((y) => y === 1000)).toBe(true);
  });

  it("démarre et finit en douceur", () => {
    expect(adoucir(0.05)).toBeLessThan(0.01);
    expect(adoucir(0.5)).toBeCloseTo(0.5, 5);
    expect(1 - adoucir(0.95)).toBeLessThan(0.01);
  });
});

describe("filmer une vraie page", () => {
  it("rend une vidéo de téléphone de la bonne taille et de la bonne durée, qui défile", async () => {
    const page = `data:text/html,${encodeURIComponent('<body style="margin:0">' + Array.from({ length: 12 }, (_, i) => `<section style="height:400px;background:hsl(${i * 30},70%,50%)">Bloc ${i}</section>`).join("") + "</body>")}`;
    const destination = join(dossierJetable("video"), "parcours-1.mp4");
    const navigateur = await lancerLeNavigateur();
    try {
      expect(await filmerUnePage(navigateur, page, destination)).toEqual({ ok: true, defile: true });
    } finally {
      await navigateur.close();
    }
    const sonde = spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=width,height:format=duration", "-of", "compact", destination], { encoding: "utf-8" }).stdout;
    expect(sonde).toContain("width=780|height=1688");
    expect(Number(/duration=([\d.]+)/.exec(sonde)?.[1])).toBeCloseTo(DUREE_DE_LA_VIDEO, 0);
  }, 120_000);
});
