import { etatDeLEditeur } from "./film-editeur";
import { etatDesMedias } from "./film-medias";
import { getFilmPublicDir } from "./film-store";
import { languesDuFilm } from "./film-fiche-depart";

/**
 * Le chemin absolu d'un média ATTENDU et PRÉSENT, ou `null`. Sert à relire
 * une image déposée pour son aperçu : un chemin qui n'est pas dans la liste
 * de la fiche (ou qui sort du dossier) ne se lit jamais. SERVEUR SEULEMENT.
 */
export function cheminDUnMediaAttendu(id: string, relatif: string): string | null {
  const etat = etatDeLEditeur(id);
  if (!etat?.valide) return null;
  const media = etatDesMedias(etat.fiche, getFilmPublicDir(id), languesDuFilm(etat.fiche)).medias.find(
    (m) => m.relatif === relatif && m.present && !m.horsDuDossier,
  );
  return media ? media.absolu : null;
}
