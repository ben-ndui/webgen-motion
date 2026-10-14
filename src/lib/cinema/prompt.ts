import type { PlanDeCinema } from "../../../remotion/film/cinema/types";
import type { FilmSpec } from "../../../remotion/film/spec";
import { paletteEnMots } from "./couleurs";

/**
 * Le prompt envoyé à Veo pour un plan : la consigne de la personne, plus ce
 * qui doit rester IDENTIQUE d'un plan à l'autre (personnage, objet, palette,
 * ambiance). C'est cette répétition mot pour mot qui a gardé la même femme et
 * le même flacon dans la démo SAYA du 14/10.
 */
export type PromptDeVeo = { prompt: string; negatif: string };

const CADRAGE: Record<PlanDeCinema["role"], string> = {
  scene: "Cinematic vertical shot for a high-end brand film.",
  geste: "Cinematic vertical close-up for a high-end brand film.",
  objet: "Cinematic vertical product shot for a high-end brand film.",
};

const AMBIANCE: Record<NonNullable<FilmSpec["direction"]>, string> = {
  nocturne: "Night atmosphere, deep shadows with warm glowing highlights, moody and elegant.",
  editorial: "Bright natural daylight, clean soft light, editorial magazine look.",
  marque: "Soft natural light, elegant and refined.",
};

// Veo écrit mal les lettres : aucun texte dans l'image, la marque vient de son
// vrai logo en fin de Reel.
const NEGATIF_COMMUN = "text, letters, words, captions, label, logo, watermark, distorted hands, extra fingers, deformed face, blurry, low quality, cartoon";
// Sur une scène, Veo ajoute volontiers un produit au premier plan.
const NEGATIF_DE_SCENE = "product, packaging, bottle";

function enPhrase(texte: string): string {
  const propre = texte.trim();
  return /[.!?]$/.test(propre) ? propre : `${propre}.`;
}

export function composerLePrompt(spec: Pick<FilmSpec, "marque" | "direction" | "cinema">, plan: PlanDeCinema): PromptDeVeo {
  const cinema = spec.cinema;
  if (!cinema) throw new Error("composerLePrompt : la fiche n'a pas de « cinema »");
  const { encre, accent, clair } = spec.marque.couleurs;
  const morceaux = [CADRAGE[plan.role], enPhrase(plan.consigne)];
  // Le personnage n'a rien à faire dans un plan d'objet seul ; l'objet n'a rien
  // à faire dans une scène (Veo le poserait au premier plan).
  if (plan.role !== "objet" && cinema.personnage) morceaux.push(`The character: ${enPhrase(cinema.personnage)}`);
  if (plan.role !== "scene" && cinema.objet) morceaux.push(`The object: ${enPhrase(cinema.objet)} It has no label and no text.`);
  morceaux.push(AMBIANCE[spec.direction ?? "marque"]);
  morceaux.push(`Color palette: ${paletteEnMots([encre, accent, clair])}.`);
  morceaux.push("Shallow depth of field, slow camera movement, 35mm film look.");
  const negatif = plan.role === "scene" ? `${NEGATIF_COMMUN}, ${NEGATIF_DE_SCENE}` : NEGATIF_COMMUN;
  return { prompt: morceaux.join(" "), negatif };
}

