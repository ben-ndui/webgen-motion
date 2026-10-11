import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { Browser, Page } from "puppeteer";

import { FORMATS, type Format, ouvrir } from "./navigateur-du-site";

/**
 * Filmer une page du site : elle défile en douceur, comme sous un pouce,
 * pour devenir un « écran vivant » du film. SERVEUR SEULEMENT.
 *
 * On ne filme pas en temps réel (l'enregistrement natif de Puppeteer rend
 * un fichier vide avec ce navigateur, et une machine chargée saccaderait) :
 * on POSE la page à chaque image, on la photographie, puis ffmpeg assemble.
 * La vidéo est donc parfaitement fluide, quelle que soit la machine.
 */
export const IMAGES_PAR_SECONDE = 30;
// Assez long pour couvrir une étape du parcours et son passage en voisin,
// même sur une musique lente ; le défilement occupe les trois premiers quarts.
export const DUREE_DE_LA_VIDEO = 8;
const PART_QUI_DEFILE = 0.75;

// Un téléphone filmé en 2x suffit au cadre du film (780 × 1688).
const RESOLUTION: Record<Format, { width: number; height: number; deviceScaleFactor: number }> = {
  telephone: { width: FORMATS.telephone.width, height: FORMATS.telephone.height, deviceScaleFactor: 2 },
  ordinateur: { width: FORMATS.ordinateur.width, height: FORMATS.ordinateur.height, deviceScaleFactor: 1 },
};

/** Le mouvement d'un pouce : démarre doucement, file, ralentit. */
export function adoucir(p: number): number {
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}

/** Position de défilement de chaque image, de 0 à `distance`, puis à l'arrêt. */
export function positionsDuDefilement(distance: number, images: number): number[] {
  const mouvement = Math.round(images * PART_QUI_DEFILE);
  return Array.from({ length: images }, (_, i) => Math.round(distance * adoucir(Math.min(1, i / mouvement))));
}

async function preparer(page: Page, format: Format): Promise<number> {
  await page.setViewport({ ...FORMATS[format], ...RESOLUTION[format] });
  // Un défilement « smooth » en CSS retarderait chaque position posée.
  await page.addStyleTag({ content: "html, body { scroll-behavior: auto !important; }" });
  return page.evaluate(() => Math.max(0, Math.min(innerHeight * 1.4, document.documentElement.scrollHeight - innerHeight)));
}

export type VideoFilmee = { ok: true; defile: boolean } | { ok: false; raison: string };

export async function filmerUnePage(navigateur: Browser, url: string, destination: string, format: Format = "telephone"): Promise<VideoFilmee> {
  const page = await ouvrir(navigateur, url, format);
  const images = mkdtempSync(join(tmpdir(), "genmotion-film-"));
  try {
    const distance = await preparer(page, format);
    const positions = positionsDuDefilement(distance, DUREE_DE_LA_VIDEO * IMAGES_PAR_SECONDE);
    for (const [i, y] of positions.entries()) {
      await page.evaluate((haut) => scrollTo({ top: haut, behavior: "instant" }), y);
      writeFileSync(join(images, `${String(i).padStart(4, "0")}.jpg`), await page.screenshot({ type: "jpeg", quality: 88 }));
    }
    mkdirSync(dirname(destination), { recursive: true });
    const sortie = spawnSync("ffmpeg", [
      "-v", "error", "-y", "-framerate", String(IMAGES_PAR_SECONDE), "-i", join(images, "%04d.jpg"),
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-movflags", "+faststart", destination,
    ]);
    if (sortie.status !== 0) return { ok: false, raison: "la vidéo n'a pas pu être assemblée" };
    // Une page plus courte que l'écran ne défile pas : la vidéo resterait une image.
    return { ok: true, defile: distance > 0 };
  } finally {
    rmSync(images, { recursive: true, force: true });
    await page.close();
  }
}
