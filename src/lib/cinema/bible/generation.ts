import { join } from "node:path";

import { estUnExemple } from "../../../../remotion/film/cinema/exemples";
import { BUDGET_D_IMAGES_PAR_DEFAUT } from "../../../../remotion/film/cinema/validerCinema";
import { ecrireAtomiquement, genreDImage } from "../../film-fichiers-deposes";
import { LIEUX_PAR_DEFAUT, type Lieux, type Refus, SANS_CLE, ficheAvecCinema } from "../lieux";
import { genererUnPortraitChezGoogle } from "../portrait";
import { type VueDeReference, VUES_DU_TYPE, ficheVisuelleDe, trouverLaReference } from "./etat";
import { ajouterUneVersion, prochaineVersion } from "./gestes";
import { promptDeLaVue } from "./prompt";
import { cleDeLaVue, confirmerUneImage, libererSansFrais, reserverUneImage } from "./reservation";
import { lireLaBible, modifierLaBible } from "./stockage";

/**
 * Générer ou importer une image d'une vue de la bible, et la citer dans
 * bible.json. SERVEUR SEULEMENT. Même recette que l'ancien portrait du
 * 14/10 (Gemini image, fond neutre) — généralisée aux 4 vues, aux éléments,
 * et à l'import d'un fichier.
 */
export type ReponseDImage = { ok: true; fichier: string } | Refus;

function cheminDeLImage(referenceId: string, vue: VueDeReference, n: number, extension: "jpg" | "png"): string {
  return `cinema/bible/${referenceId}/${vue}-v${n}.${extension}`;
}

function raisonVerrouillee(): string {
  return "Cette référence est validée, donc verrouillée : déverrouille-la d'abord pour en générer une nouvelle image.";
}

export async function genererUneImageDeLaBible(id: string, referenceId: string, vue: VueDeReference, partiel: Partial<Lieux> = {}): Promise<ReponseDImage> {
  const lieux: Lieux = { ...LIEUX_PAR_DEFAUT, ...partiel };
  const lecture = ficheAvecCinema(id, lieux);
  if (!lecture.ok) return lecture;
  const reference = trouverLaReference(lecture.cinema, referenceId);
  if (!reference) return { ok: false, statut: 404, raison: `La référence « ${referenceId} » n'existe pas dans ce film.` };
  if (!VUES_DU_TYPE[reference.type].includes(vue)) return { ok: false, statut: 400, raison: "Cette vue n'existe pas pour ce type de référence." };
  if (estUnExemple("description", reference.description)) {
    return { ok: false, statut: 400, raison: `Décris d'abord ${reference.nom} : sa description est encore l'exemple.` };
  }
  const client = lieux.veo();
  if (!client) return SANS_CLE;

  const dossier = lieux.dossier(id);
  // Vérifié avant de payer : ajouterUneVersion le refuserait de toute façon,
  // mais après avoir généré l'image chez Google pour rien.
  if (ficheVisuelleDe(lireLaBible(dossier), reference).statut === "valide") return { ok: false, statut: 409, raison: raisonVerrouillee() };

  const plafond = lecture.cinema.budgetImages ?? BUDGET_D_IMAGES_PAR_DEFAUT;
  const cle = cleDeLaVue(referenceId, vue);
  const reservation = modifierLaBible(dossier, (bible) => reserverUneImage(bible, cle, plafond));
  if (!reservation.ok && reservation.raison === "en-cours") return { ok: false, statut: 409, raison: "Cette vue est déjà en cours de génération." };
  if (!reservation.ok) {
    return { ok: false, statut: 409, raison: `Budget d'images atteint : ${reservation.generees} sur ${plafond}. Augmente-le dans les réglages du film.` };
  }

  const resultat = await genererUnPortraitChezGoogle(client, promptDeLaVue(reference, vue));
  if (!resultat.ok) {
    modifierLaBible(dossier, (bible) => libererSansFrais(bible, cle));
    return { ok: false, statut: 502, raison: resultat.raison };
  }

  const pose = modifierLaBible(dossier, (bible) => {
    const fiche = (bible.references[referenceId] ??= ficheVisuelleDe(bible, reference));
    const n = prochaineVersion(fiche, vue);
    const fichier = cheminDeLImage(referenceId, vue, n, resultat.extension);
    ecrireAtomiquement(join(lieux.public(id), fichier), resultat.octets);
    const erreur = ajouterUneVersion(fiche, vue, { n, fichier, origine: "generee", creeeLe: new Date().toISOString() });
    if (erreur) libererSansFrais(bible, cle);
    else confirmerUneImage(bible, cle);
    return { erreur, fichier };
  });
  return pose.erreur ? { ok: false, statut: 409, raison: pose.erreur } : { ok: true, fichier: pose.fichier };
}

export function importerUneImageDeLaBible(
  id: string,
  referenceId: string,
  vue: VueDeReference,
  octets: Uint8Array,
  droitsDeclares: boolean,
  partiel: Partial<Lieux> = {},
): ReponseDImage {
  const lieux: Lieux = { ...LIEUX_PAR_DEFAUT, ...partiel };
  const lecture = ficheAvecCinema(id, lieux);
  if (!lecture.ok) return lecture;
  const reference = trouverLaReference(lecture.cinema, referenceId);
  if (!reference) return { ok: false, statut: 404, raison: `La référence « ${referenceId} » n'existe pas dans ce film.` };
  if (!VUES_DU_TYPE[reference.type].includes(vue)) return { ok: false, statut: 400, raison: "Cette vue n'existe pas pour ce type de référence." };
  const genre = genreDImage(octets);
  if (genre !== "jpeg" && genre !== "png") return { ok: false, statut: 400, raison: "Le fichier déposé n'est pas une image JPEG ou PNG." };
  const extension = genre === "jpeg" ? "jpg" : "png";

  const dossier = lieux.dossier(id);
  const pose = modifierLaBible(dossier, (bible) => {
    const fiche = (bible.references[referenceId] ??= ficheVisuelleDe(bible, reference));
    if (fiche.statut === "valide") return { erreur: raisonVerrouillee(), fichier: "" };
    const n = prochaineVersion(fiche, vue);
    const fichier = cheminDeLImage(referenceId, vue, n, extension);
    ecrireAtomiquement(join(lieux.public(id), fichier), octets);
    const version = { n, fichier, origine: "importee" as const, creeeLe: new Date().toISOString(), ...(droitsDeclares ? { droitsDeclares: true as const } : {}) };
    const erreur = ajouterUneVersion(fiche, vue, version);
    return { erreur, fichier };
  });
  return pose.erreur ? { ok: false, statut: 409, raison: pose.erreur } : { ok: true, fichier: pose.fichier };
}
