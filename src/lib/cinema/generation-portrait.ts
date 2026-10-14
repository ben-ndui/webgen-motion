import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { Personnage } from "../../../remotion/film/cinema/types";
import { enregistrerFilm } from "../film-ecriture";
import { ecrireAtomiquement } from "../film-fichiers-deposes";
import { chargerFilm } from "../film-loader";
import { LIEUX_PAR_DEFAUT, type Lieux, type Refus, SANS_CLE, ficheAvecCinema } from "./lieux";
import { genererUnPortraitChezGoogle, promptDuPortrait } from "./portrait";
import type { ImageDeReference } from "./veo";

/**
 * Générer le portrait d'un personnage et le citer dans la fiche ; relire les
 * portraits d'un plan pour les envoyer à Veo. SERVEUR SEULEMENT.
 */
export type ReponseDuPortrait = { ok: true; portrait: string } | Refus;

export async function genererLePortrait(id: string, personnageId: string, partiel: Partial<Lieux> = {}): Promise<ReponseDuPortrait> {
  const lieux: Lieux = { ...LIEUX_PAR_DEFAUT, ...partiel };
  const lecture = ficheAvecCinema(id, lieux);
  if (!lecture.ok) return lecture;
  const personnage = lecture.cinema.personnages.find((candidat) => candidat.id === personnageId);
  if (!personnage) return { ok: false, statut: 404, raison: `Le personnage « ${personnageId} » n'existe pas dans ce film.` };
  const client = lieux.veo();
  if (!client) return SANS_CLE;

  const resultat = await genererUnPortraitChezGoogle(client, promptDuPortrait(personnage, lecture.spec.marque.couleurs.encre));
  if (!resultat.ok) return { ok: false, statut: 502, raison: resultat.raison };
  const portrait = `cinema/personnages/${personnageId}.${resultat.extension}`;
  ecrireAtomiquement(join(lieux.public(id), portrait), resultat.octets);

  // Relue juste avant d'écrire : la fiche a pu changer pendant la génération.
  const fiche = chargerFilm(id, lieux.fiches);
  const aJour = fiche?.etat === "valide" ? fiche.spec.cinema?.personnages.find((candidat) => candidat.id === personnageId) : undefined;
  if (!fiche || fiche.etat !== "valide" || !aJour) {
    return { ok: false, statut: 409, raison: `Le portrait est arrivé (${portrait}) mais la fiche a changé entre-temps : relance.` };
  }
  aJour.portrait = portrait;
  enregistrerFilm(id, fiche.spec, lieux.fiches);
  return { ok: true, portrait };
}

export type PortraitsDuPlan = { ok: true; references: ImageDeReference[] } | Refus;

/** Les portraits des personnages à l'image, lus sur le DISQUE, dans l'ordre du plan. */
export function portraitsPourVeo(presents: Personnage[], dossierPublic: string): PortraitsDuPlan {
  const references: ImageDeReference[] = [];
  for (const personnage of presents) {
    const chemin = personnage.portrait ? join(dossierPublic, personnage.portrait) : null;
    // Sans portrait, Veo inventerait un visage : on refuse plutôt que payer un plan faux.
    if (!chemin || !existsSync(chemin)) {
      return { ok: false, statut: 409, raison: `${personnage.nom} n'a pas encore de portrait : génère-le d'abord, sinon son visage changerait d'un plan à l'autre.` };
    }
    references.push({ octets: new Uint8Array(readFileSync(chemin)), mimeType: chemin.endsWith(".png") ? "image/png" : "image/jpeg" });
  }
  return { ok: true, references };
}
