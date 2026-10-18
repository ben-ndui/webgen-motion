import { homedir } from "node:os";
import { join } from "node:path";

import { estNomSur } from "../film-store";

/**
 * Où vivent les projets de format (explainer, conte, karaoké), à côté des films :
 *
 *   fiches : `formats/<id>.json` en dev, `~/.webgen-motion/fiches-formats/` dans
 *            l'app installée (même raison que getFilmsDir : serveur et runners
 *            n'ont pas le même dossier courant dans l'app) ;
 *   médias : `~/.webgen-motion/formats/<id>/public/` (`--public-dir` du rendu) ;
 *   rendus : `~/.webgen-motion/formats/<id>/out/<declinaison>.mp4`.
 */

export function getFormatsDir(env: Record<string, string | undefined> = process.env): string {
  if (env.WEBGEN_FORMATS_DIR) return env.WEBGEN_FORMATS_DIR;
  if (env.WEBGEN_RUNNERS_DIR) return join(homedir(), ".webgen-motion", "fiches-formats");
  return join(process.cwd(), "formats");
}

function dossierDuProjet(id: string): string {
  if (!estNomSur(id)) throw new Error(`Id de projet invalide : « ${id} » (lettres, chiffres, _ et - seulement)`);
  return join(homedir(), ".webgen-motion", "formats", id);
}

export function getFormatPublicDir(id: string): string {
  return join(dossierDuProjet(id), "public");
}

export function getFormatOutDir(id: string): string {
  return join(dossierDuProjet(id), "out");
}

/** URL qui sert le rendu d'une déclinaison au lecteur de la page du projet. */
export function urlDuRenduDeFormat(id: string, declinaison: string, version?: number): string {
  const base = `/api/motion/formats/video?id=${encodeURIComponent(id)}&declinaison=${encodeURIComponent(declinaison)}`;
  return version === undefined ? base : `${base}&t=${version}`;
}
