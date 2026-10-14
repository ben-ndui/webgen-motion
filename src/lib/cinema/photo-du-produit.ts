import { rmSync } from "node:fs";
import { join } from "node:path";

import { enregistrerFilm } from "../film-ecriture";
import { ecrireAtomiquement, genreDImage } from "../film-fichiers-deposes";
import { chargerFilm } from "../film-loader";
import { LIEUX_PAR_DEFAUT, type Lieux, type Refus, ficheAvecCinema } from "./lieux";

/**
 * La photo du VRAI produit : déposée par la personne, envoyée à Veo en
 * référence dans chaque plan où l'objet apparaît. Les plans générés ensuite
 * montrent le vrai produit (plus d'« APERÇU ») ; ceux d'avant restent
 * marqués comme imaginés. SERVEUR SEULEMENT.
 */
export const POIDS_MAX_DE_LA_PHOTO = 10 * 1024 * 1024;

export type ReponseDeLaPhoto = { ok: true; photo: string | null } | Refus;

function citerDansLaFiche(id: string, photo: string | null, lieux: Lieux): boolean {
  // Relue juste avant d'écrire : seul ce champ change.
  const fiche = chargerFilm(id, lieux.fiches);
  if (!fiche || fiche.etat === "invalide" || !fiche.spec.cinema) return false;
  if (photo) fiche.spec.cinema.photoDeLObjet = photo;
  else delete fiche.spec.cinema.photoDeLObjet;
  return enregistrerFilm(id, fiche.spec, lieux.fiches).ok;
}

export function deposerLaPhotoDuProduit(id: string, octets: Uint8Array, partiel: Partial<Lieux> = {}): ReponseDeLaPhoto {
  const lieux: Lieux = { ...LIEUX_PAR_DEFAUT, ...partiel };
  const lecture = ficheAvecCinema(id, lieux);
  if (!lecture.ok) return lecture;
  if (!lecture.cinema.objet) return { ok: false, statut: 400, raison: "Décris d'abord le produit : la photo l'accompagne, elle ne le remplace pas." };
  if (octets.byteLength === 0) return { ok: false, statut: 400, raison: "Le fichier est vide." };
  if (octets.byteLength > POIDS_MAX_DE_LA_PHOTO) return { ok: false, statut: 400, raison: "Photo trop lourde : 10 Mo au plus." };
  const genre = genreDImage(octets);
  if (genre !== "jpeg" && genre !== "png") return { ok: false, statut: 400, raison: "La photo doit être un JPEG ou un PNG." };

  const photo = `cinema/objet.${genre === "jpeg" ? "jpg" : "png"}`;
  // Une seule photo : l'autre format, s'il traîne d'un dépôt précédent, part.
  rmSync(join(lieux.public(id), genre === "jpeg" ? "cinema/objet.png" : "cinema/objet.jpg"), { force: true });
  ecrireAtomiquement(join(lieux.public(id), photo), octets);
  if (!citerDansLaFiche(id, photo, lieux)) return { ok: false, statut: 409, raison: "La photo est arrivée mais la fiche a changé entre-temps : redépose-la." };
  return { ok: true, photo };
}

export function retirerLaPhotoDuProduit(id: string, partiel: Partial<Lieux> = {}): ReponseDeLaPhoto {
  const lieux: Lieux = { ...LIEUX_PAR_DEFAUT, ...partiel };
  const lecture = ficheAvecCinema(id, lieux);
  if (!lecture.ok) return lecture;
  if (lecture.cinema.photoDeLObjet) rmSync(join(lieux.public(id), lecture.cinema.photoDeLObjet), { force: true });
  if (!citerDansLaFiche(id, null, lieux)) return { ok: false, statut: 409, raison: "La fiche n'a pas pu être mise à jour : réessaie." };
  return { ok: true, photo: null };
}
