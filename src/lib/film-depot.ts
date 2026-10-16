import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

import type { FilmSpec } from "../../remotion/film/spec";
import { enregistrerFilm } from "./film-ecriture";
import { languesDuFilm } from "./film-fiche-depart";
import {
  ecrireAtomiquement,
  extensionAudio,
  genreDImage,
  genreDeVideo,
  nomDeFichierSur,
  rapportDeLImage,
} from "./film-fichiers-deposes";
import { chargerFilm, getFilmsDir } from "./film-loader";
import { etatDesMedias } from "./film-medias";
import { mesurerMusique } from "./film-musique";
import { getFilmDir, getFilmPublicDir } from "./film-store";
import { normaliserUneVideo } from "./film-depot-video";
import { nomPour, remplacerUnEcran } from "./film-ecrans";
import { ecrirePropositions, lirePropositions } from "./site/propositions-store";
import { getTrack, getTrackPath } from "./motion-audio-store";

/**
 * Déposer un média dans un film, sans que la personne ait à nommer ou ranger
 * quoi que ce soit : une capture va dans la case que la fiche attend, la
 * musique est mesurée (tempo, premier temps), le logo est mesuré (proportions).
 * SERVEUR SEULEMENT.
 */

export const POIDS_MAX = { capture: 15 * 1024 * 1024, video: 80 * 1024 * 1024, musique: 30 * 1024 * 1024, logo: 5 * 1024 * 1024 } as const;

export type ResultatDuDepot = { ok: true } | { ok: false; statut: 400 | 404 | 409 | 413; raison: string };

export type Lieux = { fiches: string; public: (id: string) => string; film?: (id: string) => string };
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
  const video = genreDeVideo(octets) !== null;
  const poids = tropLourd(octets, video ? POIDS_MAX.video : POIDS_MAX.capture);
  if (poids) return poids;
  const genre = genreDImage(octets);
  if (!video && genre !== "png" && genre !== "jpeg" && genre !== "webp") {
    return { ok: false, statut: 400, raison: "Une capture doit être une image (PNG, JPEG, WebP) ou une vidéo (MP4, MOV, WebM)" };
  }
  // Le nom de la case suit le contenu : une vidéo s'appelle .mp4, une image .png.
  const [dossier, ancien] = [relatif.slice(0, relatif.lastIndexOf("/")), relatif.slice(relatif.lastIndexOf("/") + 1)];
  const nouveau = nomPour(ancien, video);
  const destination = join(lieux.public(id), dossier, nouveau);
  if (video) {
    if (!normaliserUneVideo(octets, destination)) return { ok: false, statut: 400, raison: "Cette vidéo n'a pas pu être lue" };
  } else {
    ecrireAtomiquement(destination, octets);
  }
  if (nouveau !== ancien) {
    const spec = structuredClone(lecture.spec);
    remplacerUnEcran(spec, ancien, nouveau);
    const ecriture = enregistrerFilm(id, spec, lieux.fiches);
    if (!ecriture.ok) return ecriture;
  }
  // Déposée à la main, la case appartient à la personne : un remplissage
  // depuis le site ne la remplacera plus.
  oublierLaCaptureDeGenMotion(id, [`${dossier}/${ancien}`, `${dossier}/${nouveau}`], lieux);
  return { ok: true };
}

function oublierLaCaptureDeGenMotion(id: string, relatifs: string[], lieux: Lieux): void {
  const dossierDuFilm = lieux.film ?? getFilmDir;
  const propositions = lirePropositions(id, dossierDuFilm);
  const restantes = Object.fromEntries(Object.entries(propositions).filter(([cle]) => !relatifs.some((r) => cle === `capture:${r}`)));
  if (Object.keys(restantes).length !== Object.keys(propositions).length) ecrirePropositions(id, restantes, dossierDuFilm);
}

/** La musique du film : déposée, mesurée, puis citée par la fiche. */
export function deposerMusique(id: string, nomOriginal: string, octets: Uint8Array, lieux: Lieux = LIEUX_PAR_DEFAUT): ResultatDuDepot {
  const lecture = ficheValide(id, lieux);
  if (!lecture.ok) return lecture;
  const extension = extensionAudio(nomOriginal);
  if (!extension) return { ok: false, statut: 400, raison: "Formats lus : MP3, M4A, MP4, WAV, AAC ou OGG" };
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

/**
 * Un morceau de la bibliothèque de GEN MOTION (celle des tours) : copié dans
 * le film et mesuré, exactement comme un morceau déposé.
 */
export function deposerMusiqueDeLaBibliotheque(
  id: string,
  idDuMorceau: string,
  lieux: Lieux = LIEUX_PAR_DEFAUT,
  bibliotheque: { morceau: typeof getTrack; chemin: typeof getTrackPath } = { morceau: getTrack, chemin: getTrackPath },
): ResultatDuDepot {
  const morceau = bibliotheque.morceau(idDuMorceau);
  const chemin = bibliotheque.chemin(idDuMorceau);
  if (!morceau || !chemin) return { ok: false, statut: 404, raison: "Ce morceau n'est plus dans la bibliothèque" };
  return deposerMusique(id, morceau.originalName, new Uint8Array(readFileSync(chemin)), lieux);
}
