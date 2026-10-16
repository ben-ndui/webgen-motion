import type { ResumeDuRemplissage } from "../use-remplissage";

/** Les onglets de l'assistant vers lesquels le récap peut renvoyer. */
export type Destination = "marque" | "serie" | "ecrans" | "histoire";
export type AFaire = { texte: string; destination: Destination; bouton: string };

const LIBELLES_A_ECRIRE: Record<string, string> = {
  conversation: "la conversation", constat: "le constat", chiffre: "le chiffre", promesse: "la promesse",
  parcours: "les légendes du parcours", momentCle: "le moment clé", troisMots: "les trois mots", ouTrouver: "la fin",
  motSignature: "le mot signature", anneau: "la phrase qui tourne", legendes: "les légendes des Reels", signature: "la ligne sous le logo",
};

function pluriel(nombre: number, singulier: string, plurielDuMot: string): string {
  return `${nombre} ${nombre > 1 ? plurielDuMot : singulier}`;
}

/**
 * Ce qui reste à faire après le remplissage, chaque ligne menant au bon
 * onglet. Dans l'ordre où ça compte : ce que GEN MOTION n'a pas pu faire,
 * puis ce qu'il a proposé et qu'il faut relire.
 */
export function aFaireApres(resume: ResumeDuRemplissage): AFaire[] {
  const liste: AFaire[] = [];
  const aEcrire = [...new Set(resume.aEcrire.map((cle) => LIBELLES_A_ECRIRE[cle.split(".")[1] ?? ""] ?? cle))];
  if (aEcrire.length > 0) liste.push({ texte: `Écrire toi-même ${aEcrire.join(", ")}`, destination: "histoire", bouton: "Écrire" });
  if (!resume.logo) liste.push({ texte: "Déposer ton logo : il n'a pas été trouvé sur le site", destination: "marque", bouton: "Déposer" });
  if (resume.textesProposes > 0) {
    liste.push({ texte: `Relire ${pluriel(resume.textesProposes, "texte proposé, marqué", "textes proposés, marqués")} « Proposé, à vérifier »`, destination: "histoire", bouton: "Relire" });
  }
  if (resume.suggestionsEnAttente > 0) {
    liste.push({ texte: `Comparer ${pluriel(resume.suggestionsEnAttente, "proposition", "propositions")} avec ce que tu avais déjà écrit`, destination: "histoire", bouton: "Comparer" });
  }
  if (resume.serie?.startsWith("un premier épisode")) liste.push({ texte: "Relire le premier épisode de ta série", destination: "serie", bouton: "Relire" });
  if (resume.marque.length > 0) liste.push({ texte: "Vérifier tes couleurs : certaines n'ont pas pu être lues", destination: "marque", bouton: "Vérifier" });
  if (resume.captures + resume.videos > 0) liste.push({ texte: "Regarder tes écrans et changer ceux qui ne te plaisent pas", destination: "ecrans", bouton: "Voir" });
  return liste;
}

/** Ce qu'il est bon de savoir, sans action à mener. */
export function aSavoir(resume: ResumeDuRemplissage): string[] {
  const notes: string[] = [];
  // Seulement s'il y a AUSSI des nouvelles : sinon le chiffre du récap le dit déjà.
  if (resume.capturesGardees > 0 && resume.captures > 0) notes.push(`${pluriel(resume.capturesGardees, "capture déjà là, gardée telle quelle", "captures déjà là, gardées telles quelles")}.`);
  if (resume.textesProposes === 0) notes.push(`Textes : ${resume.redaction}.`);
  if (resume.serie && !resume.serie.startsWith("un premier épisode")) notes.push(`Série : ${resume.serie}.`);
  for (const note of resume.marque) notes.push(`${note.charAt(0).toUpperCase()}${note.slice(1)}.`);
  return notes;
}
