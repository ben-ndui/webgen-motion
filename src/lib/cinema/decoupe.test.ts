import { spawnSync } from "node:child_process";
import { statSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { dossierJetable } from "../film-fixtures.test-utils";
import { IMAGES_DE_LA_PLANCHE, fabriquerLaPlanche } from "./decoupe";

// Une vraie vidéo verticale de 8 s, comme celles de Veo (en plus petit).
function videoDe8Secondes(dossier: string): string {
  const chemin = join(dossier, "plan.mp4");
  spawnSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "testsrc=s=108x192:d=8:r=24", "-pix_fmt", "yuv420p", chemin]);
  return chemin;
}

function largeurDe(png: string): number {
  const sortie = spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=width", "-of", "csv=p=0", png], { encoding: "utf-8" });
  return Number.parseInt(sortie.stdout, 10);
}

describe("fabriquerLaPlanche", () => {
  it("met seize images côte à côte (une toutes les demi-secondes sur 8 s)", () => {
    const dossier = dossierJetable("planche");
    const planche = join(dossier, "planches", "plan.png");
    expect(fabriquerLaPlanche(videoDe8Secondes(dossier), planche)).toBe(true);
    // 16 images de 120 px, séparées de 2 px (pas de bord : tile ne met l'espace qu'entre les images).
    expect(largeurDe(planche)).toBe(IMAGES_DE_LA_PLANCHE * 120 + (IMAGES_DE_LA_PLANCHE - 1) * 2);
  });

  it("ne refait pas une planche à jour, mais refait celle d'un plan regénéré", () => {
    const dossier = dossierJetable("planche");
    const video = videoDe8Secondes(dossier);
    const planche = join(dossier, "plan.png");
    fabriquerLaPlanche(video, planche);
    const avant = statSync(planche).mtimeMs;
    expect(fabriquerLaPlanche(video, planche)).toBe(true);
    expect(statSync(planche).mtimeMs).toBe(avant);
    const plusTard = new Date(avant + 60_000);
    utimesSync(video, plusTard, plusTard);
    fabriquerLaPlanche(video, planche);
    expect(statSync(planche).mtimeMs).toBeGreaterThan(avant);
  });

  it("refuse une vidéo absente ou illisible", () => {
    const dossier = dossierJetable("planche");
    expect(fabriquerLaPlanche(join(dossier, "absente.mp4"), join(dossier, "p.png"))).toBe(false);
    const cassee = join(dossier, "cassee.mp4");
    writeFileSync(cassee, "pas une vidéo");
    expect(fabriquerLaPlanche(cassee, join(dossier, "p2.png"))).toBe(false);
  });
});
