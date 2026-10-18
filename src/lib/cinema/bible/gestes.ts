import { type FicheVisuelle, type TypeDeReference, type VersionDUneVue, type VueDeReference, VUES_DU_TYPE, imagePrincipale, versionRetenue } from "./etat";

/**
 * Les gestes sur la fiche visuelle d'une référence : ajouter une version,
 * revenir à une ancienne, choisir la vue principale, valider, déverrouiller.
 * Purs : ils modifient la fiche reçue et rendent `null`, ou la phrase qui dit
 * pourquoi c'est refusé (la fiche n'a alors pas bougé).
 */
export const LONGUEUR_MAX_DU_MOTIF = 200;

const VERROUILLEE = "Cette référence est validée, donc verrouillée : déverrouille-la d'abord (le déverrouillage est noté).";

export function prochaineVersion(fiche: FicheVisuelle, vue: VueDeReference): number {
  return Math.max(0, ...(fiche.vues[vue]?.versions ?? []).map((version) => version.n)) + 1;
}

/** Une nouvelle image (générée ou importée) devient la version retenue de sa vue. */
export function ajouterUneVersion(fiche: FicheVisuelle, vue: VueDeReference, version: VersionDUneVue): string | null {
  if (fiche.statut === "valide") return VERROUILLEE;
  const etat = fiche.vues[vue] ?? { versions: [], retenue: version.n };
  if (etat.versions.some((connue) => connue.n === version.n)) return `La version ${version.n} existe déjà pour cette vue.`;
  etat.versions.push(version);
  etat.retenue = version.n;
  fiche.vues[vue] = etat;
  return null;
}

export function revenirAUneVersion(fiche: FicheVisuelle, vue: VueDeReference, n: number): string | null {
  if (fiche.statut === "valide") return VERROUILLEE;
  const etat = fiche.vues[vue];
  if (!etat?.versions.some((version) => version.n === n)) return `La version ${n} n'existe pas pour cette vue.`;
  etat.retenue = n;
  return null;
}

export function choisirLaPrincipale(fiche: FicheVisuelle, type: TypeDeReference, vue: VueDeReference): string | null {
  if (fiche.statut === "valide") return VERROUILLEE;
  if (!VUES_DU_TYPE[type].includes(vue)) return "Cette vue n'existe pas pour ce type de référence.";
  if (!versionRetenue(fiche, vue)) return "Cette vue n'a pas encore d'image : génère-la ou importe-la d'abord.";
  fiche.principale = vue;
  return null;
}

/** Valider fige la référence : c'est elle, et elle seule, qui part chez Veo. */
export function validerLaReference(fiche: FicheVisuelle, type: TypeDeReference, maintenant: string): string | null {
  if (fiche.statut === "valide") return null;
  if (!imagePrincipale(fiche, type)) return "Rien à valider : cette référence n'a encore aucune image.";
  fiche.statut = "valide";
  fiche.journal.push({ action: "validation", le: maintenant });
  return null;
}

/** Déverrouiller demande un motif : il reste dans le journal de la référence. */
export function deverrouillerLaReference(fiche: FicheVisuelle, motif: string, maintenant: string): string | null {
  if (fiche.statut !== "valide") return null;
  const propre = motif.trim();
  if (propre === "") return "Dis pourquoi tu la déverrouilles : le motif reste dans son historique.";
  if (propre.length > LONGUEUR_MAX_DU_MOTIF) return `Le motif tient en ${LONGUEUR_MAX_DU_MOTIF} caractères.`;
  fiche.statut = "propose";
  fiche.journal.push({ action: "deverrouillage", le: maintenant, motif: propre });
  return null;
}
