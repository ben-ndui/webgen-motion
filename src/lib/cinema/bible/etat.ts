import type { CinemaDuFilm, Personnage, TypeDElement } from "../../../../remotion/film/cinema/types";

/**
 * La bible visuelle d'une série : pour chaque personnage, créature, objet ou
 * décor, ses images de référence. Une image importée ou générée devient une
 * VERSION de sa vue (rien n'est écrasé) ; une référence VALIDÉE est
 * verrouillée, et seule une référence validée part chez Veo avec un plan.
 * Les images vivent dans bible.json (serveur) ; ce module, pur, sait les
 * lire. L'écran l'importe.
 */
export type TypeDeReference = "personnage" | TypeDElement;
export type VueDeReference = "face" | "trois-quarts" | "profil" | "en-pied" | "image";
export type StatutDeReference = "propose" | "valide";

export type VersionDUneVue = {
  n: number;
  // cinema/bible/<reference>/<vue>-v<n>.jpg|png, ou l'ancien portrait.
  fichier: string;
  origine: "generee" | "importee";
  // null pour l'ancien portrait (date inconnue).
  creeeLe: string | null;
  // Import d'un master : la personne a déclaré en détenir les droits.
  droitsDeclares?: true;
};

export type VueDeLaBible = { versions: VersionDUneVue[]; retenue: number };

export type EvenementDuVerrou = { action: "validation" | "deverrouillage"; le: string; motif?: string };

export type FicheVisuelle = {
  statut: StatutDeReference;
  vues: Partial<Record<VueDeReference, VueDeLaBible>>;
  // La vue envoyée à Veo. Absente : la première vue qui a une image (ordre de VUES_DU_TYPE).
  principale?: VueDeReference;
  journal: EvenementDuVerrou[];
};

export type Bible = {
  references: Record<string, FicheVisuelle>;
  // Images payées chez Google pour ce film (les imports ne comptent pas).
  imagesGenerees: number;
  // « <reference>/<vue> » → début de la génération en cours (contre le double clic).
  enCours: Record<string, string>;
};

export type ReferenceDeLaSerie = { id: string; type: TypeDeReference; nom: string; description: string; portrait?: string };

// Personnage et créature : quatre vues ; un objet ou un décor : une image.
export const VUES_DU_TYPE: Record<TypeDeReference, readonly VueDeReference[]> = {
  personnage: ["en-pied", "face", "trois-quarts", "profil"],
  creature: ["en-pied", "face", "trois-quarts", "profil"],
  objet: ["image"],
  decor: ["image"],
};

export const NOM_DE_LA_VUE: Record<VueDeReference, string> = {
  face: "Face",
  "trois-quarts": "Trois-quarts",
  profil: "Profil",
  "en-pied": "En pied",
  image: "Image",
};

export const NOM_DU_TYPE: Record<TypeDeReference, string> = { personnage: "Personnage", creature: "Créature", objet: "Objet", decor: "Décor" };

export const bibleVide = (): Bible => ({ references: {}, imagesGenerees: 0, enCours: {} });

/** Toutes les références de la série : les personnages, puis les éléments. */
export function referencesDeLaSerie(cinema: CinemaDuFilm): ReferenceDeLaSerie[] {
  const personnages = cinema.personnages.map((p: Personnage): ReferenceDeLaSerie => ({ ...p, type: "personnage" }));
  return [...personnages, ...(cinema.elements ?? [])];
}

export function trouverLaReference(cinema: CinemaDuFilm, id: string): ReferenceDeLaSerie | undefined {
  return referencesDeLaSerie(cinema).find((reference) => reference.id === id);
}

/**
 * La fiche visuelle d'une référence. Un personnage d'avant la bible n'a
 * qu'un portrait dans la fiche : il devient la version 1 de sa vue « en
 * pied », PROPOSÉE (personne ne l'a validé). Rejouée, la migration ne
 * duplique rien : elle ne s'applique qu'aux références absentes de bible.json.
 */
export function ficheVisuelleDe(bible: Bible, reference: ReferenceDeLaSerie): FicheVisuelle {
  const connue = bible.references[reference.id];
  if (connue) return connue;
  if (reference.type === "personnage" && reference.portrait) {
    const ancienne: VersionDUneVue = { n: 1, fichier: reference.portrait, origine: "generee", creeeLe: null };
    return { statut: "propose", vues: { "en-pied": { versions: [ancienne], retenue: 1 } }, journal: [] };
  }
  return { statut: "propose", vues: {}, journal: [] };
}

export function versionRetenue(fiche: FicheVisuelle, vue: VueDeReference): VersionDUneVue | null {
  const etat = fiche.vues[vue];
  return etat?.versions.find((version) => version.n === etat.retenue) ?? null;
}

/** La vue qui part chez Veo : la principale choisie si elle a une image, sinon la première qui en a une. */
export function vuePrincipale(fiche: FicheVisuelle, type: TypeDeReference): VueDeReference | null {
  if (fiche.principale && versionRetenue(fiche, fiche.principale)) return fiche.principale;
  return VUES_DU_TYPE[type].find((vue) => versionRetenue(fiche, vue) !== null) ?? null;
}

export function imagePrincipale(fiche: FicheVisuelle, type: TypeDeReference): VersionDUneVue | null {
  const vue = vuePrincipale(fiche, type);
  return vue ? versionRetenue(fiche, vue) : null;
}

/**
 * L'image à envoyer à Veo : jamais une référence encore proposée, même si
 * elle a une image choisie. Le canon de la Bible l'exige (§12) : une
 * variation pas encore validée ne doit pas partir en génération.
 */
export function imageValideePourVeo(fiche: FicheVisuelle, type: TypeDeReference): VersionDUneVue | null {
  return fiche.statut === "valide" ? imagePrincipale(fiche, type) : null;
}

export function estUneVue(valeur: unknown): valeur is VueDeReference {
  return typeof valeur === "string" && (Object.keys(NOM_DE_LA_VUE) as string[]).includes(valeur);
}
