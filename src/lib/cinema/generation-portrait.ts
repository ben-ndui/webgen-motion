import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { estUnExemple } from "../../../remotion/film/cinema/exemples";
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
  if (estUnExemple("description", personnage.description)) {
    return { ok: false, statut: 400, raison: `Décris d'abord ${personnage.nom} : sa description est encore l'exemple.` };
  }
  const client = lieux.veo();
  if (!client) return SANS_CLE;

  const resultat = await genererUnPortraitChezGoogle(client, promptDuPortrait(personnage));
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

/**
 * Les images de référence du plan, lues sur le DISQUE : les portraits des
 * personnages à l'image, dans l'ordre du plan, puis la photo du produit.
 */
export function portraitsPourVeo(presents: Personnage[], dossierPublic: string, photoDuProduit?: string): PortraitsDuPlan {
  const references: ImageDeReference[] = [];
  for (const personnage of presents) {
    const chemin = personnage.portrait ? join(dossierPublic, personnage.portrait) : null;
    // Sans portrait, Veo inventerait un visage : on refuse plutôt que payer un plan faux.
    if (!chemin || !existsSync(chemin)) {
      return { ok: false, statut: 409, raison: `${personnage.nom} n'a pas encore de portrait : génère-le d'abord, sinon son visage changerait d'un plan à l'autre.` };
    }
    references.push({ octets: new Uint8Array(readFileSync(chemin)), mimeType: chemin.endsWith(".png") ? "image/png" : "image/jpeg" });
  }
  if (photoDuProduit) {
    const chemin = join(dossierPublic, photoDuProduit);
    // Citée mais absente : le produit serait réinventé, on refuse plutôt que payer un plan faux.
    if (!existsSync(chemin)) return { ok: false, statut: 409, raison: "La photo du produit est citée mais absente : dépose-la de nouveau." };
    references.push({ octets: new Uint8Array(readFileSync(chemin)), mimeType: chemin.endsWith(".png") ? "image/png" : "image/jpeg" });
  }
  return { ok: true, references };
}
