import { LIEUX_PAR_DEFAUT, type Lieux, type Refus, ficheAvecCinema } from "../lieux";
import { type FicheVisuelle, type ReferenceDeLaSerie, ficheVisuelleDe, referencesDeLaSerie } from "./etat";
import { lireLaBible } from "./stockage";

/** Une référence de la série, telle que l'écran bible en a besoin : ses textes et sa fiche visuelle. */
export type ReferenceAffichee = ReferenceDeLaSerie & { fiche: FicheVisuelle };

export type ReponseDeLaBible = { ok: true; references: ReferenceAffichee[] } | Refus;

/** Toutes les références de la série, chacune avec sa fiche visuelle (bible.json). */
export function lireLaBibleDeLaSerie(id: string, partiel: Partial<Lieux> = {}): ReponseDeLaBible {
  const lieux: Lieux = { ...LIEUX_PAR_DEFAUT, ...partiel };
  const lecture = ficheAvecCinema(id, lieux);
  if (!lecture.ok) return lecture;
  const bible = lireLaBible(lieux.dossier(id));
  const references = referencesDeLaSerie(lecture.cinema).map((reference) => ({ ...reference, fiche: ficheVisuelleDe(bible, reference) }));
  return { ok: true, references };
}
