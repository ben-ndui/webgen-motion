import type { PlanDeCinema, SceneDeCinema } from "../../../remotion/film/cinema/types";
import type { FilmSpec } from "../../../remotion/film/spec";
import { paletteEnMots } from "./couleurs";
import { personnagesDuPlan } from "./plans";

/**
 * Le prompt envoyé à Veo pour un plan : la consigne, plus ce qui doit rester
 * IDENTIQUE d'un plan à l'autre (décor de la scène, personnages, objet,
 * palette, ambiance). Chaque personnage est nommé avec le numéro de son
 * portrait de référence : c'est le portrait qui garde le visage, le texte
 * dit à Veo qui est qui.
 */
export type PromptDeVeo = { prompt: string; negatif: string };

const AMBIANCE: Record<NonNullable<FilmSpec["direction"]>, string> = {
  nocturne: "Night atmosphere, deep shadows with warm glowing highlights, moody and elegant.",
  editorial: "Bright natural daylight, clean soft light, editorial magazine look.",
  marque: "Soft natural light, elegant and refined.",
};

// Veo écrit mal les lettres : aucun texte dans l'image, la marque vient de son
// vrai logo en fin d'épisode. Pas de sous-titres non plus : ils seraient faux.
const NEGATIF_COMMUN = "text, letters, words, subtitles, captions, label, logo, watermark, distorted hands, extra fingers, deformed face, blurry, low quality, cartoon";
// Sans objet à l'image, Veo pose volontiers un produit au premier plan.
const NEGATIF_SANS_OBJET = "product, packaging, bottle";

function enPhrase(texte: string): string {
  const propre = texte.trim();
  return /[.!?]$/.test(propre) ? propre : `${propre}.`;
}

export function composerLePrompt(
  spec: Pick<FilmSpec, "marque" | "direction" | "cinema">,
  scene: SceneDeCinema,
  plan: PlanDeCinema,
): PromptDeVeo {
  const cinema = spec.cinema;
  if (!cinema) throw new Error("composerLePrompt : la fiche n'a pas de « cinema »");
  const { encre, accent, clair } = spec.marque.couleurs;
  const presents = personnagesDuPlan(cinema, plan);
  const cadrage = presents.length > 0 ? "Cinematic vertical shot of a short drama series." : "Cinematic vertical shot for a high-end brand film.";
  const decor = enPhrase(scene.decor);
  const morceaux = [cadrage, `The scene takes place in this setting: ${decor}`, enPhrase(plan.consigne)];
  presents.forEach((personnage, index) => {
    morceaux.push(`${personnage.nom} (reference image ${index + 1}): ${enPhrase(personnage.description)}`);
  });
  if (plan.objet && cinema.objet) morceaux.push(`The object: ${enPhrase(cinema.objet)} It has no label and no text.`);
  if (plan.replique) {
    const orateur = presents.find((personnage) => personnage.id === plan.replique?.personnage);
    if (orateur) morceaux.push(`${orateur.nom} says softly in French: « ${plan.replique.texte.trim()} » Natural lip movement.`);
  }
  // Recette du 14/10 : sans ce rappel, un gros plan a repris le fond et la pose
  // du portrait de référence au lieu du décor. Le décor revient donc à la fin.
  if (presents.length > 0) {
    morceaux.push(`Keep this setting all around the characters: ${decor} Never reuse the plain studio background or the pose of the reference images.`);
  }
  morceaux.push(AMBIANCE[spec.direction ?? "marque"]);
  morceaux.push(`Color palette: ${paletteEnMots([encre, accent, clair])}.`);
  morceaux.push("Shallow depth of field, slow camera movement, 35mm film look.");
  const negatif = plan.objet ? NEGATIF_COMMUN : `${NEGATIF_COMMUN}, ${NEGATIF_SANS_OBJET}`;
  return { prompt: morceaux.join(" "), negatif };
}
