import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { ecrireAtomiquement } from "../film-fichiers-deposes";
import { getFilmDir } from "../film-store";
import type { LectureDuSite } from "./lecture-du-site";

/**
 * Ce que GEN MOTION a lu sur le site au dernier remplissage, gardé à côté de
 * la fiche : « Écrire avec Claude » réécrit une section à partir de ces
 * FAITS (textes, chiffres réels) sans rouvrir le site. Sans elle, Claude
 * n'aurait plus que la fiche et risquerait d'inventer. SERVEUR SEULEMENT.
 */
const FICHIER = "lecture-du-site.json";

// Ce qui sert à écrire : le texte du site. Les couleurs et logos ont déjà fait leur travail.
export type MemoireDuSite = Pick<LectureDuSite, "url" | "titre" | "description" | "nomDuSite" | "textes"> & {
  pages: string[];
};

export function memoireDe(lecture: LectureDuSite): MemoireDuSite {
  return {
    url: lecture.url,
    titre: lecture.titre,
    description: lecture.description,
    nomDuSite: lecture.nomDuSite,
    textes: lecture.textes,
    pages: lecture.liens.filter((lien) => lien.dansLeMenu).map((lien) => lien.texte).filter(Boolean),
  };
}

export function garderLaMemoire(id: string, lecture: LectureDuSite, dossierDuFilm: (id: string) => string = getFilmDir): void {
  ecrireAtomiquement(join(dossierDuFilm(id), FICHIER), new TextEncoder().encode(`${JSON.stringify(memoireDe(lecture), null, 2)}\n`));
}

function listeDeTextes(valeur: unknown): string[] {
  return Array.isArray(valeur) ? valeur.filter((v): v is string => typeof v === "string") : [];
}

/** La mémoire du site, ou null si le site n'a jamais été lu (ou si le fichier est abîmé). */
export function lireLaMemoire(id: string, dossierDuFilm: (id: string) => string = getFilmDir): MemoireDuSite | null {
  const chemin = join(dossierDuFilm(id), FICHIER);
  if (!existsSync(chemin)) return null;
  try {
    const brut = JSON.parse(readFileSync(chemin, "utf-8")) as Record<string, unknown>;
    const textes = (brut.textes ?? {}) as Record<string, unknown>;
    if (typeof brut.url !== "string") return null;
    return {
      url: brut.url,
      titre: typeof brut.titre === "string" ? brut.titre : "",
      description: typeof brut.description === "string" ? brut.description : "",
      nomDuSite: typeof brut.nomDuSite === "string" ? brut.nomDuSite : "",
      textes: {
        titres: listeDeTextes(textes.titres),
        paragraphes: listeDeTextes(textes.paragraphes),
        boutons: listeDeTextes(textes.boutons),
        chiffres: listeDeTextes(textes.chiffres),
      },
      pages: listeDeTextes(brut.pages),
    };
  } catch {
    return null;
  }
}
