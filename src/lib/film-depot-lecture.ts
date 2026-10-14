import { existsSync } from "node:fs";
import { join } from "node:path";

import type { FilmSpec } from "../../remotion/film/spec";
import { etatDeLEditeur } from "./film-editeur";
import { getFilmsDir } from "./film-loader";
import { etatDesMedias } from "./film-medias";
import { getFilmPublicDir } from "./film-store";
import { languesDuFilm } from "./film-fiche-depart";

/**
 * Les fichiers que la série du film cite : portraits et plans générés. Leurs
 * chemins sont déjà bornés par le validateur (cinema/<id>.mp4,
 * cinema/personnages/<id>.jpg|png) : aucun ne sort de cinema/.
 */
function fichiersDuCinema(fiche: FilmSpec): string[] {
  const cinema = fiche.cinema;
  if (!cinema) return [];
  const portraits = cinema.personnages.flatMap((p) => (p.portrait ? [p.portrait] : []));
  const plans = cinema.episodes.flatMap((e) => e.scenes.flatMap((s) => s.plans.flatMap((p) => (p.fichier ? [p.fichier] : []))));
  return [...portraits, ...plans];
}

type Dossiers = { fiches: string; public: (id: string) => string };

/**
 * Le chemin absolu d'un média ATTENDU et PRÉSENT, ou `null`. Sert à relire
 * une image déposée pour son aperçu : un chemin qui n'est pas dans la liste
 * de la fiche (ou qui sort du dossier) ne se lit jamais. SERVEUR SEULEMENT.
 */
export function cheminDUnMediaAttendu(
  id: string,
  relatif: string,
  dossiers: Dossiers = { fiches: getFilmsDir(), public: getFilmPublicDir },
): string | null {
  const etat = etatDeLEditeur(id, dossiers);
  if (!etat?.valide) return null;
  const dossierPublic = dossiers.public(id);
  if (fichiersDuCinema(etat.fiche).includes(relatif)) {
    const absolu = join(dossierPublic, relatif);
    return existsSync(absolu) ? absolu : null;
  }
  const media = etatDesMedias(etat.fiche, dossierPublic, languesDuFilm(etat.fiche)).medias.find(
    (m) => m.relatif === relatif && m.present && !m.horsDuDossier,
  );
  return media ? media.absolu : null;
}
