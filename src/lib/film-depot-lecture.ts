import { existsSync } from "node:fs";
import { join } from "node:path";

import type { FilmSpec } from "../../remotion/film/spec";
import { lireLaBible } from "./cinema/bible/stockage";
import { etatDeLEditeur } from "./film-editeur";
import { getFilmsDir } from "./film-loader";
import { etatDesMedias } from "./film-medias";
import { getFilmDir, getFilmPublicDir } from "./film-store";
import { languesDuFilm } from "./film-fiche-depart";

/**
 * Les fichiers que la série du film cite : portraits, plans générés, photo
 * du produit. Leurs chemins sont déjà bornés par le validateur
 * (cinema/<id>.mp4, cinema/personnages/<id>.jpg|png, cinema/objet.jpg|png) :
 * aucun ne sort de cinema/.
 */
function fichiersDuCinema(fiche: FilmSpec): string[] {
  const cinema = fiche.cinema;
  if (!cinema) return [];
  const portraits = cinema.personnages.flatMap((p) => (p.portrait ? [p.portrait] : []));
  const plans = cinema.episodes.flatMap((e) => e.scenes.flatMap((s) => s.plans.flatMap((p) => (p.fichier ? [p.fichier] : []))));
  const photo = cinema.photoDeLObjet ? [cinema.photoDeLObjet] : [];
  return [...portraits, ...plans, ...photo];
}

type Dossiers = { fiches: string; public: (id: string) => string; dossier?: (id: string) => string };

/**
 * Les images de la bible visuelle (cinema/bible/<référence>/<vue>-v<n>.jpg|png) :
 * bible.json vit dans le dossier du film, pas dans la fiche elle-même, donc
 * `fichiersDuCinema` (qui ne lit que la fiche) ne les voit pas.
 */
function fichiersDeLaBible(id: string, dossiers: Dossiers): string[] {
  const bible = lireLaBible((dossiers.dossier ?? getFilmDir)(id));
  return Object.values(bible.references).flatMap((fiche) => Object.values(fiche.vues).flatMap((vue) => vue?.versions.map((version) => version.fichier) ?? []));
}

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
  if (fichiersDuCinema(etat.fiche).includes(relatif) || fichiersDeLaBible(id, dossiers).includes(relatif)) {
    const absolu = join(dossierPublic, relatif);
    return existsSync(absolu) ? absolu : null;
  }
  const media = etatDesMedias(etat.fiche, dossierPublic, languesDuFilm(etat.fiche)).medias.find(
    (m) => m.relatif === relatif && m.present && !m.horsDuDossier,
  );
  return media ? media.absolu : null;
}
