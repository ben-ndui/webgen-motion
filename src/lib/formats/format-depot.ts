import { rmSync } from "node:fs";
import { join } from "node:path";

import { POIDS_MAX, type ResultatDuDepot } from "../film-depot";
import { ecrireAtomiquement, extensionAudio, nomDeFichierSur } from "../film-fichiers-deposes";
import { mesurerMusique } from "../film-musique";
import { type FicheDeFormat } from "./catalogue";
import { chargerProjet, enregistrerProjet } from "./format-loader";
import { getFormatPublicDir, getFormatsDir } from "./format-store";

/**
 * Déposer la musique d'un projet de format. SERVEUR SEULEMENT. Comme pour
 * les films (film-depot.ts) : le serveur range, renomme et MESURE (tempo,
 * premier temps), la personne n'a rien à nommer ni à compter.
 *
 * - explainer et conte : c'est la musique de fond (`spec.musique`) ;
 * - karaoké : c'est LE MORCEAU de l'artiste (`spec.morceau`). Son passage
 *   (début, fin) est ramené dans la durée du morceau.
 */

export type LieuxDesFormats = { fiches: string; public: (id: string) => string };

const LIEUX_PAR_DEFAUT: LieuxDesFormats = { fiches: getFormatsDir(), public: getFormatPublicDir };

export function deposerMusiqueDuFormat(
  id: string,
  nomOriginal: string,
  octets: Uint8Array,
  lieux: LieuxDesFormats = LIEUX_PAR_DEFAUT,
): ResultatDuDepot {
  const projet = chargerProjet(id, lieux.fiches);
  if (!projet) return { ok: false, statut: 404, raison: "Projet introuvable" };
  if (projet.etat === "invalide") return { ok: false, statut: 409, raison: "Le projet a des erreurs : les corriger avant d'y déposer un fichier" };
  const extension = extensionAudio(nomOriginal);
  if (!extension) return { ok: false, statut: 400, raison: "Formats lus : MP3, M4A, MP4, WAV, AAC ou OGG" };
  if (octets.byteLength > POIDS_MAX.musique) return { ok: false, statut: 413, raison: "Fichier trop lourd (30 Mo au plus)" };

  const relatif = `musique/${nomDeFichierSur(nomOriginal)}.${extension}`;
  const absolu = join(lieux.public(id), relatif);
  ecrireAtomiquement(absolu, octets);
  const mesure = mesurerMusique(absolu);
  if (!mesure.ok) {
    rmSync(absolu, { force: true });
    return { ok: false, statut: 400, raison: mesure.raison };
  }

  const fiche = structuredClone(projet.fiche) as FicheDeFormat;
  const titre = nomOriginal.replace(/\.[^.]*$/, "").trim() || "Morceau déposé";
  if (fiche.format === "karaoke") {
    const { morceau } = fiche.spec;
    // Un morceau déposé se prend EN ENTIER : garder le passage de l'exemple (13 s à 33,9 s) faisait
    // un clip de 26 s sur une chanson de 3 min 24 (Ben, 17/10). On raccourcit ensuite pour un reel.
    const fin = Math.round(mesure.dureeSec * 10) / 10;
    // Le teaser (réseaux) part sur les 30 premières secondes : on le règle ensuite sur le refrain.
    const teaser = { debut: 0, fin: Math.min(30, fin) };
    fiche.spec.morceau = { ...morceau, fichier: relatif, titre: morceau.titre || titre, debut: 0, fin, teaser, tempo: mesure.tempo, premierTemps: mesure.premierTemps };
  } else {
    fiche.spec.musique = { fichier: relatif, titre, source: "Morceau déposé dans GEN MOTION", tempo: mesure.tempo, premierTemps: mesure.premierTemps };
  }
  const ecriture = enregistrerProjet(id, fiche, lieux.fiches);
  return ecriture.ok ? { ok: true } : ecriture;
}
