import { genreDImage, rapportDeLImage } from "../film-fichiers-deposes";
import type { LogoLu } from "./lecture-du-site";

/**
 * Le logo du site, s'il est dans un format que le film sait poser (PNG ou
 * SVG : la transparence compte). L'en-tête d'abord, puis les icônes ;
 * l'image de partage (og) seulement en dernier, c'est souvent une photo.
 * SERVEUR SEULEMENT (télécharge).
 */
export type LogoTrouve = { octets: Uint8Array; genre: "png" | "svg"; rapport: number; url: string };

const ORDRE: LogoLu["source"][] = ["entete", "icone", "og"];
const POIDS_MAX = 5 * 1024 * 1024;
// Une icône minuscule (favicon 32 px) ferait un logo flou en 1080 px.
const COTE_MINIMUM_PNG = 120;

export async function trouverLeLogo(logos: LogoLu[]): Promise<LogoTrouve | null> {
  const tries = [...logos].sort((a, b) => ORDRE.indexOf(a.source) - ORDRE.indexOf(b.source));
  for (const logo of tries) {
    try {
      const reponse = await fetch(logo.url, { signal: AbortSignal.timeout(10_000) });
      if (!reponse.ok) continue;
      const octets = new Uint8Array(await reponse.arrayBuffer());
      if (octets.byteLength === 0 || octets.byteLength > POIDS_MAX) continue;
      const genre = genreDImage(octets);
      if (genre !== "png" && genre !== "svg") continue;
      const rapport = rapportDeLImage(octets, genre);
      if (!rapport) continue;
      if (genre === "png") {
        const hauteur = new DataView(octets.buffer, octets.byteOffset).getUint32(20);
        if (hauteur < COTE_MINIMUM_PNG && rapport * hauteur < COTE_MINIMUM_PNG) continue;
      }
      return { octets, genre, rapport: Math.round(rapport * 1000) / 1000, url: logo.url };
    } catch {
      continue;
    }
  }
  return null;
}
