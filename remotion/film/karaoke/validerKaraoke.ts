// La garde de la fiche d'un karaoké, et celle de ses paroles calées.
// Lu tel quel par Node au rendu : types seulement, imports AVEC extension.
import type { KaraokeSpec, ParolesDuKaraoke } from "./spec";
import { erreursDeLaSpec } from "../validerSpec.ts";

type Erreurs = string[];

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === "object" && valeur !== null && !Array.isArray(valeur);
}

function texte(erreurs: Erreurs, chemin: string, valeur: unknown): void {
  if (typeof valeur !== "string" || valeur.trim().length === 0) erreurs.push(`${chemin} : texte non vide attendu`);
}

function nombre(erreurs: Erreurs, chemin: string, valeur: unknown, minimum: number): void {
  if (!(typeof valeur === "number" && Number.isFinite(valeur) && valeur >= minimum)) erreurs.push(`${chemin} : nombre ≥ ${minimum}`);
}

/** Toutes les erreurs de la fiche ; liste vide = fiche valide. */
export function erreursDuKaraoke(entree: unknown): string[] {
  if (!estObjet(entree)) return ["la fiche du karaoké doit être un objet"];
  const erreurs: Erreurs = [];
  if (typeof entree.exemple !== "boolean") erreurs.push("exemple : vrai ou faux");
  if (typeof entree.sujet !== "string" || !/^[a-z0-9-]+$/.test(entree.sujet)) erreurs.push("sujet : minuscules, chiffres et tirets");
  // La marque et les déclinaisons suivent les règles du film. Le karaoké n'a pas de musique à part : c'est le morceau.
  const communes = erreursDeLaSpec({ exemple: false, marque: entree.marque, declinaisons: entree.declinaisons }).filter((e) =>
    /^(marque|declinaisons)/.test(e),
  );
  erreurs.push(...communes);
  const m = estObjet(entree.morceau) ? entree.morceau : {};
  texte(erreurs, "morceau.fichier", m.fichier);
  texte(erreurs, "morceau.titre", m.titre);
  texte(erreurs, "morceau.artiste", m.artiste);
  nombre(erreurs, "morceau.debut", m.debut, 0);
  nombre(erreurs, "morceau.fin", m.fin, 0);
  nombre(erreurs, "morceau.tempo", m.tempo, 40);
  nombre(erreurs, "morceau.premierTemps", m.premierTemps, 0);
  if (typeof m.debut === "number" && typeof m.fin === "number" && m.fin - m.debut < 5) erreurs.push("morceau.fin : au moins 5 s après le début");
  texte(erreurs, "paroles", entree.paroles);
  if (entree.decor !== "horizon") erreurs.push("decor : « horizon »");
  const textes = estObjet(entree.textes) ? entree.textes : {};
  for (const langue of ["fr", "en"]) {
    const t = estObjet(textes[langue]) ? textes[langue] : {};
    texte(erreurs, `textes.${langue}.disponible`, t.disponible);
  }
  return erreurs;
}

/**
 * Les paroles calées : refusées en LIVRAISON si elles viennent du brouillon de
 * whisper (le texte affiché doit être celui de l'artiste) ou si le passage
 * retenu n'en contient aucune.
 */
export function erreursDesParoles(paroles: ParolesDuKaraoke, spec: Pick<KaraokeSpec, "morceau">, livraison: boolean): string[] {
  const erreurs: Erreurs = [];
  if (livraison && paroles.source.includes("brouillon")) {
    erreurs.push(`paroles : calées sur le brouillon de whisper (${paroles.source}) ; l'artiste corrige le texte, puis on recale`);
  }
  const dansLePassage = paroles.lignes.filter((l) => {
    const debut = l.mots[0]?.debut ?? -1;
    return debut >= spec.morceau.debut && debut < spec.morceau.fin;
  });
  if (dansLePassage.length === 0) erreurs.push("paroles : aucune ligne chantée dans le passage retenu (morceau.debut / morceau.fin)");
  return erreurs;
}

export function validerKaraoke(entree: unknown): KaraokeSpec {
  const erreurs = erreursDuKaraoke(entree);
  if (erreurs.length > 0) throw new Error(`Fiche du karaoké invalide (${erreurs.length}) :\n  - ${erreurs.join("\n  - ")}`);
  return entree as KaraokeSpec;
}
