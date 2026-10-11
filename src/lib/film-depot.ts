import { rmSync } from "node:fs";
import { join } from "node:path";

import type { FilmSpec } from "../../remotion/film/spec";
import { enregistrerFilm } from "./film-ecriture";
import { languesDuFilm } from "./film-fiche-depart";
import {
  ecrireAtomiquement,
  extensionAudio,
  genreDImage,
  nomDeFichierSur,
  rapportDeLImage,
} from "./film-fichiers-deposes";
import { chargerFilm, getFilmsDir } from "./film-loader";
import { etatDesMedias } from "./film-medias";
import { mesurerMusique } from "./film-musique";
import { getFilmPublicDir } from "./film-store";

/**
 * Déposer un média dans un film, sans que la personne ait à nommer ou ranger
 * quoi que ce soit : une capture va dans la case que la fiche attend, la
 * musique est mesurée (tempo, premier temps), le logo est mesuré (proportions).
 * SERVEUR SEULEMENT.
 */

export const POIDS_MAX = { capture: 15 * 1024 * 1024, musique: 30 * 1024 * 1024, logo: 5 * 1024 * 1024 } as const;

export type ResultatDuDepot = { ok: true } | { ok: false; statut: 400 | 404 | 409 | 413; raison: string };

type Lieux = { fiches: string; public: (id: string) => string };
const LIEUX_PAR_DEFAUT: Lieux = { fiches: getFilmsDir(), public: getFilmPublicDir };

function ficheValide(id: string, lieux: Lieux): { ok: true; spec: FilmSpec } | ResultatDuDepot & { ok: false } {
  const fiche = chargerFilm(id, lieux.fiches);
  if (!fiche) return { ok: false, statut: 404, raison: "Film introuvable" };
  if (fiche.etat === "invalide") {
    return { ok: false, statut: 409, raison: "La fiche du film a des erreurs : corrige-les avant de déposer des fichiers" };
  }
  return { ok: true, spec: fiche.spec };
}

function tropLourd(octets: Uint8Array, max: number): ResultatDuDepot | null {
  if (octets.byteLength === 0) return { ok: false, statut: 400, raison: "Le fichier est vide" };
  if (octets.byteLength > max) {
    return { ok: false, statut: 413, raison: `Fichier trop lourd : ${Math.round(max / 1024 / 1024)} Mo au plus` };
  }
  return null;
}

/** Une capture, dans l'une des cases attendues par la fiche (`relatif`). */
export function deposerCapture(id: string, relatif: string, octets: Uint8Array, lieux: Lieux = LIEUX_PAR_DEFAUT): ResultatDuDepot {
  const lecture = ficheValide(id, lieux);
  if (!lecture.ok) return lecture;
  const attendus = etatDesMedias(lecture.spec, lieux.public(id), languesDuFilm(lecture.spec)).medias;
  const case_ = attendus.find((media) => media.role === "capture" && media.relatif === relatif && !media.horsDuDossier);
  if (!case_) return { ok: false, statut: 400, raison: "Cette capture n'est pas attendue par le film" };
  const poids = tropLourd(octets, POIDS_MAX.capture);
  if (poids) return poids;
  const genre = genreDImage(octets);
  if (genre !== "png" && genre !== "jpeg" && genre !== "webp") {
    return { ok: false, statut: 400, raison: "Une capture doit être une image PNG, JPEG ou WebP" };
  }
  ecrireAtomiquement(case_.absolu, octets);
  return { ok: true };
}

/** La musique du film : déposée, mesurée, puis citée par la fiche. */
export function deposerMusique(id: string, nomOriginal: string, octets: Uint8Array, lieux: Lieux = LIEUX_PAR_DEFAUT): ResultatDuDepot {
  const lecture = ficheValide(id, lieux);
  if (!lecture.ok) return lecture;
  const extension = extensionAudio(nomOriginal);
  if (!extension) return { ok: false, statut: 400, raison: "Formats lus : MP3, M4A, WAV, AAC ou OGG" };
  const poids = tropLourd(octets, POIDS_MAX.musique);
  if (poids) return poids;

  const relatif = `musique/${nomDeFichierSur(nomOriginal)}.${extension}`;
  const absolu = join(lieux.public(id), relatif);
  ecrireAtomiquement(absolu, octets);
  const mesure = mesurerMusique(absolu);
  if (!mesure.ok) {
    rmSync(absolu, { force: true });
    return { ok: false, statut: 400, raison: mesure.raison };
  }
  const spec = structuredClone(lecture.spec);
  spec.musique = {
    fichier: relatif,
    titre: nomOriginal.replace(/\.[^.]*$/, "").trim() || "Morceau déposé",
    source: "Morceau déposé dans GEN MOTION",
    tempo: mesure.tempo,
    premierTemps: mesure.premierTemps,
  };
  const ecriture = enregistrerFilm(id, spec, lieux.fiches);
  return ecriture.ok ? { ok: true } : ecriture;
}

/** Le logo officiel (PNG ou SVG, fond transparent), qui remplace le logo en texte. */
export function deposerLogo(id: string, nomOriginal: string, octets: Uint8Array, lieux: Lieux = LIEUX_PAR_DEFAUT): ResultatDuDepot {
  const lecture = ficheValide(id, lieux);
  if (!lecture.ok) return lecture;
  const poids = tropLourd(octets, POIDS_MAX.logo);
  if (poids) return poids;
  const genre = genreDImage(octets);
  if (genre !== "png" && genre !== "svg") {
    return { ok: false, statut: 400, raison: "Le logo doit être un PNG ou un SVG, idéalement sur fond transparent" };
  }
  const rapport = rapportDeLImage(octets, genre);
  if (!rapport) return { ok: false, statut: 400, raison: "Impossible de lire les dimensions de ce logo" };

  const relatif = `logo/${nomDeFichierSur(nomOriginal)}.${genre}`;
  ecrireAtomiquement(join(lieux.public(id), relatif), octets);
  const spec = structuredClone(lecture.spec);
  const inverser = spec.marque.logo.type === "image" ? spec.marque.logo.inverser : false;
  spec.marque.logo = { type: "image", fichier: relatif, rapport: Math.round(rapport * 1000) / 1000, inverser };
  const ecriture = enregistrerFilm(id, spec, lieux.fiches);
  return ecriture.ok ? { ok: true } : ecriture;
}
