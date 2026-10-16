import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { dirname } from "node:path";
import { ffmpeg } from "../binaires-video";

/**
 * La planche contact d'un plan : une image toutes les demi-secondes, côte à
 * côte, pour repérer d'un coup d'œil ce qu'il faut couper (le fondu que Veo
 * glisse parfois au milieu d'un plan, constaté le 14/10 sur le jardin).
 * SERVEUR SEULEMENT (ffmpeg).
 *
 * Pas de détection automatique : mesurée le 14/10 sur dix plans réels, la
 * différence d'images ne sépare pas ce fondu du simple mouvement de caméra
 * (33 pour le fondu, jusqu'à 43 pour un travelling). Une suggestion fausse
 * ferait couper au mauvais endroit : c'est la personne qui regarde et décide.
 */
export const IMAGES_DE_LA_PLANCHE = 16;
export const ECART_ENTRE_IMAGES_S = 0.5;
const LARGEUR_D_UNE_IMAGE = 120;

/**
 * Fabrique la planche si elle manque ou si la vidéo est plus récente (plan
 * refait). Rend vrai si la planche est prête.
 */
export function fabriquerLaPlanche(video: string, planche: string): boolean {
  if (!existsSync(video)) return false;
  if (existsSync(planche) && statSync(planche).mtimeMs >= statSync(video).mtimeMs) return true;
  mkdirSync(dirname(planche), { recursive: true });
  const sortie = spawnSync(ffmpeg(), [
    "-v", "error", "-y", "-i", video,
    "-vf", `fps=${1 / ECART_ENTRE_IMAGES_S},scale=${LARGEUR_D_UNE_IMAGE}:-2,tile=${IMAGES_DE_LA_PLANCHE}x1:padding=2`,
    "-frames:v", "1", planche,
  ]);
  return sortie.status === 0 && existsSync(planche);
}
