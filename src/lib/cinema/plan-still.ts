import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { type FichierJson, lireLeJson, modifierLeJson } from "./json-sous-verrou";
import { lireLaBible } from "./bible/stockage";
import { genererUnPortraitChezGoogle } from "./portrait";
import { LIEUX_PAR_DEFAUT, type Lieux, type Refus, ficheAvecCinema } from "./lieux";
import { portraitsPourVeo } from "./generation-portrait";
import { referencesDuPlan, trouverLePlan } from "./plans";
import { composerLePrompt } from "./prompt";
import { ecrireAtomiquement } from "../film-fichiers-deposes";
import type { ImageDeReference } from "./veo";

/**
 * L'image fixe d'un plan : avant d'animer, on valide UNE image qui compose
 * déjà tous ses personnages/objets/décor exactement comme la bible les fixe.
 * C'est la méthode du pack de production (PROMPT IMAGE FIXE, puis
 * image-to-vidéo sur ce still validé) — jusqu'ici jamais câblée : la
 * génération d'un plan partait direct du texte + des portraits séparés vers
 * la vidéo, ce qui demande à Veo de composer PLUSIEURS visages réalistes en
 * mouvement d'un coup (plus sensible à son filtre qu'animer un still déjà
 * approuvé). planches.json, dans le dossier du film. SERVEUR SEULEMENT.
 */

export type VersionDeLaPlanche = { n: number; fichier: string; creeeLe: string };
export type FicheDeLaPlanche = { statut: "propose" | "valide"; versions: VersionDeLaPlanche[]; retenue: number };
export type Planches = { plans: Record<string, FicheDeLaPlanche> };

function source(dossier: string): FichierJson<Planches> {
  return {
    dossier,
    fichier: "planches.json",
    nom: "Les images fixes des plans",
    vide: () => ({ plans: {} }),
    normaliser: (brut) => ({ plans: brut.plans ?? {} }),
  };
}

export function lireLesPlanches(dossier: string): Planches {
  return lireLeJson(source(dossier));
}

function ficheVide(): FicheDeLaPlanche {
  return { statut: "propose", versions: [], retenue: 0 };
}

export function versionRetenueDeLaPlanche(fiche: FicheDeLaPlanche | undefined): VersionDeLaPlanche | undefined {
  return fiche?.versions.find((v) => v.n === fiche.retenue);
}

const RAISON_VERROUILLEE = "Cette image fixe est validée, donc verrouillée : déverrouille-la d'abord pour en regénérer une.";

export type ReponseDeLaPlanche = { ok: true; fichier: string } | Refus;

export async function genererUneImageFixe(id: string, planId: string, partiel: Partial<Lieux> = {}): Promise<ReponseDeLaPlanche> {
  const lieux: Lieux = { ...LIEUX_PAR_DEFAUT, ...partiel };
  const lecture = ficheAvecCinema(id, lieux);
  if (!lecture.ok) return lecture;
  const situe = trouverLePlan(lecture.cinema, planId);
  if (!situe) return { ok: false, statut: 404, raison: `Le plan « ${planId} » n'existe pas dans ce film.` };
  const client = lieux.veo();
  if (!client) return { ok: false, statut: 412, raison: "Aucune clé Gemini : ajoute-la dans les Réglages pour générer." };

  const dossier = lieux.dossier(id);
  const fiche = lireLesPlanches(dossier).plans[planId];
  if (fiche?.statut === "valide") return { ok: false, statut: 409, raison: RAISON_VERROUILLEE };

  const portraits = portraitsPourVeo(referencesDuPlan(lecture.cinema, situe.plan), lieux.public(id), lireLaBible(dossier));
  if (!portraits.ok) return portraits;

  const composition = composerLePrompt(lecture.spec, situe.scene, situe.plan, true);
  const prompt = `${composition.prompt} Avoid: ${composition.negatif}.`;
  const resultat = await genererUnPortraitChezGoogle(client, prompt, portraits.references);
  if (!resultat.ok) return { ok: false, statut: 502, raison: resultat.raison };

  const n = (fiche?.versions.at(-1)?.n ?? 0) + 1;
  const fichier = `cinema/${planId}/image-fixe-v${n}.${resultat.extension}`;
  ecrireAtomiquement(join(lieux.public(id), fichier), resultat.octets);
  modifierLeJson(source(dossier), (planches) => {
    const courante = (planches.plans[planId] ??= ficheVide());
    courante.versions.push({ n, fichier, creeeLe: new Date().toISOString() });
    courante.retenue = n;
    courante.statut = "propose";
  });
  return { ok: true, fichier };
}

export function validerUneImageFixe(id: string, planId: string, partiel: Partial<Lieux> = {}): Refus | { ok: true } {
  const lieux: Lieux = { ...LIEUX_PAR_DEFAUT, ...partiel };
  const dossier = lieux.dossier(id);
  const fiche = lireLesPlanches(dossier).plans[planId];
  if (!fiche || fiche.versions.length === 0) return { ok: false, statut: 404, raison: "Aucune image fixe générée pour ce plan." };
  modifierLeJson(source(dossier), (planches) => {
    planches.plans[planId].statut = "valide";
  });
  return { ok: true };
}

export function deverrouillerUneImageFixe(id: string, planId: string, partiel: Partial<Lieux> = {}): Refus | { ok: true } {
  const lieux: Lieux = { ...LIEUX_PAR_DEFAUT, ...partiel };
  const dossier = lieux.dossier(id);
  modifierLeJson(source(dossier), (planches) => {
    const fiche = planches.plans[planId];
    if (fiche) fiche.statut = "propose";
  });
  return { ok: true };
}

/** L'image fixe validée du plan, prête à partir en référence unique vers la vidéo — absente si pas encore validée. */
export function imageFixeValidee(dossier: string, dossierPublic: string, planId: string): ImageDeReference | undefined {
  const fiche = lireLesPlanches(dossier).plans[planId];
  if (fiche?.statut !== "valide") return undefined;
  const version = versionRetenueDeLaPlanche(fiche);
  if (!version) return undefined;
  const chemin = join(dossierPublic, version.fichier);
  if (!existsSync(chemin)) return undefined;
  return { octets: new Uint8Array(readFileSync(chemin)), mimeType: chemin.endsWith(".png") ? "image/png" : "image/jpeg" };
}
