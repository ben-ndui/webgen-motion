import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve, sep } from "node:path";

import { type FilmSpec, type Langue, LANGUES, tousLesEcrans } from "../../remotion/film/spec";

/**
 * Les médias qu'une fiche de film attend dans son dossier public
 * (`~/.webgen-motion/films/<id>/public/`) : la musique, et chaque capture
 * dans le dossier de chaque langue. Serveur seulement (node:fs).
 *
 * Ce que `validerSpec` ne peut pas savoir (fonction pure) se vérifie ici :
 * le fichier existe, il reste DANS le dossier public, et deux états de
 * l'événement ne sont pas la même image (leçon Kotizo, voir le skill
 * film-motion : un plan qui ne bouge pas).
 */

export type MediaAttendu = {
  role: "musique" | "capture";
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

function ajouter(medias: MediaAttendu[], role: MediaAttendu["role"], langue: Langue, relatif: string, dossierPublic: string) {
  const deja = medias.find((media) => media.relatif === relatif);
  if (deja) {
    if (!deja.langues.includes(langue)) deja.langues.push(langue);
    return;
  }
  const { absolu, horsDuDossier } = cheminDansLeDossier(dossierPublic, relatif);
  medias.push({
    role,
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
  for (const langue of langues) ajouter(medias, "musique", langue, spec.musique.fichier, dossierPublic);
  for (const langue of langues) {
    const dossier = spec.textes[langue].dossierDesEcrans;
    for (const ecran of tousLesEcrans(spec.ecrans)) {
      ajouter(medias, "capture", langue, `${dossier}/${ecran}`, dossierPublic);
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

/** Les médias absents (ou hors du dossier) dont une langue a besoin. */
export function mediasManquants(etat: EtatDesMedias, langue: Langue): MediaAttendu[] {
  return etat.medias.filter((media) => media.langues.includes(langue) && !media.present);
}

/** Tout ce qui empêche de rendre une langue, en phrases, avec le chemin attendu. */
export function problemesDeMedias(etat: EtatDesMedias, langue: Langue): string[] {
  const problemes = mediasManquants(etat, langue).map((media) =>
    media.horsDuDossier
      ? `${media.relatif} : chemin hors du dossier public, refusé`
      : `${media.role === "musique" ? "musique" : "capture"} absente : ${media.absolu}`,
  );
  for (const doublon of etat.doublons) {
    if (doublon.langue === langue) problemes.push(doublon.message);
  }
  return problemes;
}
