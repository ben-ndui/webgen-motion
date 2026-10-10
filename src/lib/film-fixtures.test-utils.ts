import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { FILM } from "../../remotion/film/film";
import { type FilmSpec, tousLesEcrans } from "../../remotion/film/spec";

/**
 * Outils des tests du mode « Film de marque » : une fiche valide (l'exemple
 * du gabarit, passée à `exemple: false`) et des dossiers jetables. Les
 * dossiers de TEST vivent dans tmpdir ; le code livré, jamais.
 */

export function ficheValide(): FilmSpec {
  const spec = JSON.parse(JSON.stringify(FILM)) as FilmSpec;
  spec.exemple = false;
  spec.textes.en.dossierDesEcrans = "ecrans-en";
  return spec;
}

export function dossierJetable(prefixe: string): string {
  return mkdtempSync(join(tmpdir(), `genmotion-${prefixe}-`));
}

export function ecrireFiche(dossier: string, id: string, contenu: unknown): void {
  writeFileSync(join(dossier, `${id}.json`), typeof contenu === "string" ? contenu : JSON.stringify(contenu));
}

function ecrire(chemin: string, contenu: string): void {
  mkdirSync(dirname(chemin), { recursive: true });
  writeFileSync(chemin, contenu);
}

/** Dépose musique + captures (chaque capture a un contenu différent). */
export function deposerMedias(dossierPublic: string, spec: FilmSpec, langues: ("fr" | "en")[] = ["fr", "en"]): void {
  ecrire(join(dossierPublic, spec.musique.fichier), "musique");
  for (const langue of langues) {
    const dossier = spec.textes[langue].dossierDesEcrans;
    for (const ecran of tousLesEcrans(spec.ecrans)) {
      ecrire(join(dossierPublic, dossier, ecran), `${langue}/${ecran}`);
    }
  }
}

/** Dépose les captures de la bibliothèque (adresse + éventail), chacune différente. */
export function deposerBibliotheque(dossierPublic: string, spec: FilmSpec, langues: ("fr" | "en")[] = ["fr", "en"]): void {
  const bibliotheque = spec.bibliotheque;
  if (!bibliotheque) throw new Error("La fiche de test n'a pas de bibliothèque.");
  for (const langue of langues) {
    const dossier = spec.textes[langue].dossierDesEcrans;
    for (const ecran of [bibliotheque.ecranDeLAdresse, ...bibliotheque.eventail]) {
      ecrire(join(dossierPublic, dossier, ecran), `${langue}/bibliotheque/${ecran}`);
    }
  }
}

/** La fiche valide, sans bibliothèque (ni ses textes). */
export function ficheSansBibliotheque(): FilmSpec {
  const spec = ficheValide();
  delete spec.bibliotheque;
  delete spec.textes.fr.bibliotheque;
  delete spec.textes.en.bibliotheque;
  return spec;
}
