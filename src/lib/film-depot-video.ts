import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

/**
 * Une vidéo d'écran déposée (enregistrement du téléphone, export d'un
 * outil) mise au format du film : H.264, muette, 1080 px de large au plus,
 * douze secondes au plus (au-delà, le plan ne la montrerait pas).
 * SERVEUR SEULEMENT (ffmpeg).
 */
export const DUREE_MAX_SECONDES = 12;

export function normaliserUneVideo(octets: Uint8Array, destination: string): boolean {
  const travail = mkdtempSync(join(tmpdir(), "genmotion-depot-"));
  try {
    const source = join(travail, "source");
    writeFileSync(source, octets);
    mkdirSync(dirname(destination), { recursive: true });
    const sortie = spawnSync("ffmpeg", [
      "-v", "error", "-y", "-i", source, "-t", String(DUREE_MAX_SECONDES), "-an",
      "-vf", "scale='min(1080,iw)':-2", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-movflags", "+faststart",
      destination,
    ]);
    return sortie.status === 0;
  } finally {
    rmSync(travail, { recursive: true, force: true });
  }
}
