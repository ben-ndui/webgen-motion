import { type FichierJson, lireLeJson, modifierLeJson } from "../json-sous-verrou";
import { type Bible, bibleVide } from "./etat";

/**
 * bible.json, dans le dossier du film : la fiche visuelle de chaque
 * référence (personnage, créature, objet, décor). Jamais envoyé par le
 * navigateur, jamais lu par Remotion. SERVEUR SEULEMENT.
 */
function source(dossier: string): FichierJson<Bible> {
  return {
    dossier,
    fichier: "bible.json",
    nom: "La bible visuelle",
    vide: bibleVide,
    normaliser: (brut) => ({ references: brut.references ?? {}, imagesGenerees: brut.imagesGenerees ?? 0, enCours: brut.enCours ?? {} }),
  };
}

export function lireLaBible(dossier: string): Bible {
  return lireLeJson(source(dossier));
}

export function modifierLaBible<R>(dossier: string, travail: (bible: Bible) => R): R {
  return modifierLeJson(source(dossier), travail);
}
