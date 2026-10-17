import { type FichierJson, lireLeJson, modifierLeJson } from "../json-sous-verrou";
import type { RegistreDesPrises } from "./etat";

/**
 * prises.json, dans le dossier du film : toutes les prises de chaque plan.
 * Jamais envoyé par le navigateur, jamais lu par Remotion. SERVEUR SEULEMENT.
 */
function source(dossier: string): FichierJson<RegistreDesPrises> {
  return {
    dossier,
    fichier: "prises.json",
    nom: "Le registre des prises",
    vide: () => ({ plans: {} }),
    normaliser: (brut) => ({ plans: brut.plans ?? {} }),
  };
}

export function lireLesPrises(dossier: string): RegistreDesPrises {
  return lireLeJson(source(dossier));
}

export function modifierLesPrises<R>(dossier: string, travail: (registre: RegistreDesPrises) => R): R {
  return modifierLeJson(source(dossier), travail);
}
