import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve, sep } from "node:path";

import { type FilmSpec, type Langue, LANGUES, tousLesEcrans } from "../../remotion/film/spec";
import type { TypeDeRendu } from "./film-store";

/**
 * Les médias qu'une fiche de film attend dans son dossier public
 * (`~/.webgen-motion/films/<id>/public/`) : la musique, chaque capture dans
 * le dossier de chaque langue, le fichier du logo s'il est fourni en image,
 * et les captures de la bibliothèque si la fiche en a une. Chaque média dit
 * à quel rendu il sert : une capture de l'éventail ne bloque pas le film.
 * Serveur seulement (node:fs).
 *
 * Ce que `validerSpec` ne peut pas savoir (fonction pure) se vérifie ici :
 * le fichier existe, il reste DANS le dossier public, et deux états de
 * l'événement ne sont pas la même image (leçon Kotizo, voir le skill
 * film-motion : un plan qui ne bouge pas).
 */

export type MediaAttendu = {
  role: "musique" | "capture" | "logo" | "voix";
  // Les rendus qui en ont besoin (film, bibliothèque, ou les deux).
  usages: TypeDeRendu[];
  // Les langues qui en ont besoin (la musique sert à toutes).
  langues: Langue[];
  // Chemin dans le dossier public, tel que la fiche le cite.
  relatif: string;
  // Chemin exact où le déposer.
  absolu: string;
  present: boolean;
  // `musique.fichier` ou `dossierDesEcrans` qui sort du dossier public
  // (`../`, chemin absolu) : refusé, même si le fichier existe ailleurs.
  horsDuDossier: boolean;
};

export type DoublonDeCapture = { langue: Langue; message: string };

export type EtatDesMedias = {
  dossierPublic: string;
  medias: MediaAttendu[];
  doublons: DoublonDeCapture[];
};

function cheminDansLeDossier(dossierPublic: string, relatif: string): { absolu: string; horsDuDossier: boolean } {
  const racine = resolve(dossierPublic);
  const absolu = resolve(racine, relatif);
  return { absolu, horsDuDossier: !absolu.startsWith(racine + sep) };
}

function estUnFichier(chemin: string): boolean {
  return existsSync(chemin) && statSync(chemin).isFile();
}

type Ajout = { role: MediaAttendu["role"]; langue: Langue; relatif: string; usages: TypeDeRendu[] };

function ajouter(medias: MediaAttendu[], { role, langue, relatif, usages }: Ajout, dossierPublic: string) {
  const deja = medias.find((media) => media.relatif === relatif);
  if (deja) {
    if (!deja.langues.includes(langue)) deja.langues.push(langue);
    for (const usage of usages) if (!deja.usages.includes(usage)) deja.usages.push(usage);
    return;
  }
  const { absolu, horsDuDossier } = cheminDansLeDossier(dossierPublic, relatif);
  medias.push({
    role,
    usages: [...usages],
    langues: [langue],
    relatif,
    absolu,
    horsDuDossier,
    present: !horsDuDossier && estUnFichier(absolu),
  });
}

function empreinte(chemin: string): string {
  return createHash("sha256").update(readFileSync(chemin)).digest("hex");
}

// Deux captures identiques dans une suite qui doit bouger (états de
// l'événement, étapes du parcours) : le plan resterait figé.
function doublonsDansLaSuite(langue: Langue, quoi: string, noms: string[], medias: MediaAttendu[], dossier: string) {
  const vus = new Map<string, string>();
  const doublons: DoublonDeCapture[] = [];
  for (const nom of noms) {
    const media = medias.find((m) => m.relatif === `${dossier}/${nom}`);
    if (!media?.present) continue;
    const cle = empreinte(media.absolu);
    const premier = vus.get(cle);
    if (premier && premier !== nom) {
      doublons.push({ langue, message: `${quoi} : ${dossier}/${premier} et ${dossier}/${nom} sont la même image` });
    } else {
      vus.set(cle, nom);
    }
  }
  return doublons;
}

/**
 * `langues` : celles des déclinaisons à rendre. Une langue sans déclinaison
 * n'exige aucune capture (ses textes restent obligatoires dans la fiche).
 */
export function etatDesMedias(
  spec: FilmSpec,
  dossierPublic: string,
  langues: readonly Langue[] = LANGUES,
): EtatDesMedias {
  const medias: MediaAttendu[] = [];
  const bibliotheque = spec.bibliotheque;
  // La musique et le logo servent au film et à la bibliothèque. L'épisode
  // d'une série ne les exige que s'il les joue : une série autonome peut
  // n'avoir ni musique (« aucune ») ni logo de marque (carton ou rien).
  const usagesDeLaMusique: TypeDeRendu[] = bibliotheque ? ["film", "bibliotheque"] : ["film"];
  const usagesDuLogo: TypeDeRendu[] = [...usagesDeLaMusique];
  if (spec.cinema && spec.cinema.musique !== "aucune") usagesDeLaMusique.push("episode");
  if (spec.cinema && (spec.cinema.fin?.type ?? "logo-de-la-marque") === "logo-de-la-marque") usagesDuLogo.push("episode");
  const logo = spec.marque.logo;
  for (const langue of langues) {
    ajouter(medias, { role: "musique", langue, relatif: spec.musique.fichier, usages: usagesDeLaMusique }, dossierPublic);
    if (logo.type === "image") ajouter(medias, { role: "logo", langue, relatif: logo.fichier, usages: usagesDuLogo }, dossierPublic);
  }
  // Les voix GÉNÉRÉES (une ligne sans fichier n'a rien à chercher sur le disque).
  for (const langue of langues) {
    for (const ligne of spec.voix?.lignes[langue] ?? []) {
      if (ligne.fichier) ajouter(medias, { role: "voix", langue, relatif: ligne.fichier, usages: ["film"] }, dossierPublic);
    }
  }
  for (const langue of langues) {
    const dossier = spec.textes[langue].dossierDesEcrans;
    for (const ecran of tousLesEcrans(spec.ecrans)) {
      ajouter(medias, { role: "capture", langue, relatif: `${dossier}/${ecran}`, usages: ["film"] }, dossierPublic);
    }
    if (!bibliotheque) continue;
    for (const ecran of [bibliotheque.ecranDeLAdresse, ...bibliotheque.eventail]) {
      ajouter(medias, { role: "capture", langue, relatif: `${dossier}/${ecran}`, usages: ["bibliotheque"] }, dossierPublic);
    }
  }

  const doublons: DoublonDeCapture[] = [];
  for (const langue of langues) {
    const dossier = spec.textes[langue].dossierDesEcrans;
    doublons.push(
      ...doublonsDansLaSuite(langue, "événement", spec.ecrans.evenement, medias, dossier),
      ...doublonsDansLaSuite(langue, "parcours", spec.ecrans.parcours, medias, dossier),
    );
  }
  return { dossierPublic: resolve(dossierPublic), medias, doublons };
}

/** Les médias absents (ou hors du dossier) dont un rendu a besoin dans une langue. */
export function mediasManquants(etat: EtatDesMedias, langue: Langue, type: TypeDeRendu = "film"): MediaAttendu[] {
  return etat.medias.filter((media) => media.langues.includes(langue) && media.usages.includes(type) && !media.present);
}

const MEDIA_ABSENT: Record<MediaAttendu["role"], string> = {
  musique: "musique absente",
  capture: "capture absente",
  logo: "logo absent",
  voix: "voix off absente (à régénérer)",
};

/** Tout ce qui empêche un rendu dans une langue, en phrases, avec le chemin attendu. */
export function problemesDeMedias(etat: EtatDesMedias, langue: Langue, type: TypeDeRendu = "film"): string[] {
  const problemes = mediasManquants(etat, langue, type).map((media) =>
    media.horsDuDossier
      ? `${media.relatif} : chemin hors du dossier public, refusé`
      : `${MEDIA_ABSENT[media.role]} : ${media.absolu}`,
  );
  // Les doublons portent sur les suites du FILM (événement, parcours).
  if (type === "film") {
    for (const doublon of etat.doublons) {
      if (doublon.langue === langue) problemes.push(doublon.message);
    }
  }
  return problemes;
}
