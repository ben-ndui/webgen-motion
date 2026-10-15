import type { FilmSpec } from "../../../../../../../remotion/film/spec";

/**
 * L'adresse du site à proposer d'office dans « Tes écrans » : celle donnée à
 * l'ouverture de l'assistant, sinon celle que le film affiche à la fin
 * (« Disponible sur maison.fr »). Module pur. Rien trouvé : la personne la tape.
 */
const DOMAINE = /\b((?:[a-z0-9-]+\.)+[a-z]{2,})(\/[^\s]*)?/i;

export function adresseConnue(fiche: FilmSpec, adresseAuDepart?: string): string {
  if (adresseAuDepart?.trim()) return adresseAuDepart.trim();
  for (const langue of ["fr", "en"] as const) {
    const fin = fiche.textes[langue]?.fin;
    const trouve = fin ? DOMAINE.exec(fin.disponible) : null;
    if (trouve) return trouve[0];
  }
  return "";
}
