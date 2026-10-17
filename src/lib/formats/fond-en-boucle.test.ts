import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { ffmpeg, ffprobe } from "../binaires-video";
import { DEBUT_COUPE_S, FONDU_S, mettreEnBoucle } from "./fond-en-boucle";

const dossier = mkdtempSync(join(tmpdir(), "fond-boucle-"));

/** Une vidéo dont chaque image est différente (compteur qui défile), comme un plan Veo. */
function planDe(secondes: number, nom: string): string {
  const chemin = join(dossier, nom);
  spawnSync(ffmpeg(), ["-v", "error", "-y", "-f", "lavfi", "-i", `testsrc2=size=320x180:rate=24:duration=${secondes}`, "-pix_fmt", "yuv420p", chemin]);
  return chemin;
}

function duree(fichier: string): number {
  return Number(spawnSync(ffprobe(), ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", fichier], { encoding: "utf-8" }).stdout);
}

/** Les pixels bruts d'une image, en niveaux de gris 32×18. */
function image(fichier: string, filtre: string): Buffer {
  return spawnSync(ffmpeg(), ["-v", "error", "-i", fichier, "-vf", `${filtre},scale=32:18,format=gray`, "-frames:v", "1", "-f", "rawvideo", "-"]).stdout;
}

function ecart(a: Buffer, b: Buffer): number {
  let somme = 0;
  for (let i = 0; i < a.length; i++) somme += Math.abs(a[i] - b[i]);
  return somme / a.length;
}

describe("mettreEnBoucle", () => {
  it("coupe le début, et la dernière image raccorde avec la première", () => {
    const entree = planDe(8, "plan.mp4");
    const sortie = join(dossier, "boucle.mp4");
    expect(mettreEnBoucle(entree, sortie)).toBe(true);
    expect(duree(sortie)).toBeCloseTo(8 - DEBUT_COUPE_S - FONDU_S, 0);

    const premiere = image(sortie, "select=eq(n\\,0)");
    const derniere = image(sortie, "reverse");
    const ailleurs = image(sortie, "select=eq(n\\,72)");
    // Le raccord est proche (une image d'écart), une image prise au milieu ne l'est pas.
    expect(ecart(premiere, derniere)).toBeLessThan(ecart(premiere, ailleurs) / 3);
  });

  it("refuse un plan trop court pour fondre la fin dans le début", () => {
    expect(mettreEnBoucle(planDe(2, "court.mp4"), join(dossier, "x.mp4"))).toBe(false);
  });

  it("refuse ce qui n'est pas une vidéo", () => {
    const faux = join(dossier, "faux.mp4");
    writeFileSync(faux, "pas une vidéo");
    expect(mettreEnBoucle(faux, join(dossier, "y.mp4"))).toBe(false);
  });
});
