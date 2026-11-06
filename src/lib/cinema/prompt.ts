import type { PlanDeCinema, SceneDeCinema } from "../../../remotion/film/cinema/types";
import type { FilmSpec } from "../../../remotion/film/spec";
import { paletteEnMots } from "./couleurs";
import { personnagesDuPlan, photoDuProduitDansLePlan, referencesDuPlan } from "./plans";
import { DESCRIPTEUR_DU_STYLE, STYLES_SANS_INTERDIT_CARTOON } from "./styles";

/**
 * Le prompt envoyé à Veo pour un plan : la consigne, plus ce qui doit rester
 * IDENTIQUE d'un plan à l'autre (décor de la scène, références de la bible,
 * objet, palette, ambiance). Chaque référence (personnage ou élément) est
 * nommée avec le numéro de son image de référence : c'est elle qui garde
 * l'apparence, le texte dit à Veo qui est qui.
 */
export type PromptDeVeo = { prompt: string; negatif: string };

const AMBIANCE: Record<NonNullable<FilmSpec["direction"]>, string> = {
  nocturne: "Night atmosphere, deep shadows with warm glowing highlights, moody and elegant.",
  editorial: "Bright natural daylight, clean soft light, editorial magazine look.",
  marque: "Soft natural light, elegant and refined.",
};

// Veo écrit mal les lettres : aucun texte dans l'image, la marque vient de son
// vrai logo en fin d'épisode. Pas de sous-titres non plus : ils seraient faux.
// Pas de musique non plus (Ben, 02/11/2026) : le modèle en ajoute une de son cru
// si on ne le lui interdit pas, qui se marierait mal avec la vraie musique posée
// au montage ensuite.
const NEGATIF_COMMUN =
  "text, letters, words, subtitles, captions, label, logo, watermark, distorted hands, extra fingers, deformed face, blurry, low quality, cartoon, background music, musical score, soundtrack";
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
  // Une image FIXE ne peut pas animer de synchro labiale : citer la réplique
  // pousse le modèle à l'écrire en sous-titre sur le still. La vidéo, elle,
  // garde la citation exacte (c'est elle qui anime les lèvres).
  pourStill = false,
): PromptDeVeo {
  const cinema = spec.cinema;
  if (!cinema) throw new Error("composerLePrompt : la fiche n'a pas de « cinema »");
  const { encre, accent, clair } = spec.marque.couleurs;
  const presentes = referencesDuPlan(cinema, plan);
  const cadrage = presentes.length > 0 ? "Cinematic vertical shot of a short drama series." : "Cinematic vertical shot for a high-end brand film.";
  const decor = enPhrase(scene.decor);
  const morceaux = [cadrage, `The scene takes place in this setting: ${decor}`, enPhrase(plan.consigne)];
  presentes.forEach((reference, index) => {
    morceaux.push(`${reference.nom} (reference image ${index + 1}): ${enPhrase(reference.description)}`);
  });
  if (plan.objet && cinema.objet && photoDuProduitDansLePlan(cinema, plan)) {
    // La photo vient APRÈS les références dans les images envoyées.
    morceaux.push(`The real product (reference image ${presentes.length + 1}): ${enPhrase(cinema.objet)} Reproduce it exactly as in its reference image.`);
  } else if (plan.objet && cinema.objet) {
    morceaux.push(`The object: ${enPhrase(cinema.objet)} It has no label and no text.`);
  }
  if (plan.replique) {
    const orateur = personnagesDuPlan(cinema, plan).find((personnage) => personnage.id === plan.replique?.personnage);
    if (orateur) {
      // Recette du 02/11 : défaut récurrent sur TOUS les plans parlés — le
      // personnage regarde la caméra au lieu de son interlocuteur (le signe
      // « généré par IA » le plus visible), et sur un cadrage long/complexe,
      // le modèle improvise son propre texte EN ANGLAIS au lieu de la
      // réplique française fournie (tout le reste du prompt étant en
      // anglais). Les deux consignes sont donc explicites et isolées, sans
      // ambiguïté possible, et nomment précisément QUI regarder.
      const autres = presentes.filter((reference) => reference.id !== orateur.id).map((reference) => reference.nom);
      const regard = autres.length > 0 ? `${orateur.nom} looks directly at ${autres.join(" and ")}` : `${orateur.nom} looks naturally within the scene`;
      const dit = pourStill
        ? `${orateur.nom} is mid-sentence, lips softly parted as if speaking — no caption, no subtitle, no written words anywhere in the image.`
        : `${orateur.nom} speaks ONLY this exact line, in FRENCH, word for word, with natural lip movement matching the French words — never translate it, never improvise different words, never speak English: « ${plan.replique.texte.trim()} »`;
      morceaux.push(`${regard} while speaking, fully engaged in the moment — never breaking the fourth wall, never glancing at the camera. ${dit}`);
    }
  } else {
    // Même sans réplique écrite, le modèle improvise parfois un dialogue
    // audible pour des figurants (recette du 02/11, plan sans personnage
    // nommé : deux invitées se sont mises à parler anglais). Personne d'autre
    // n'a de texte à dire : le lui interdire explicitement.
    morceaux.push("No one in this shot speaks any audible dialogue. Any background chatter stays an indistinct murmur, never clear English words.");
  }
  // Recette du 14/10 : sans ce rappel, un gros plan a repris le fond et la pose
  // du portrait de référence au lieu du décor. Le décor revient donc à la fin.
  if (presentes.length > 0 || photoDuProduitDansLePlan(cinema, plan)) {
    morceaux.push(`Keep this setting all around the characters: ${decor} Never reuse the plain studio background or the pose of the reference images.`);
  }
  const style = cinema.style && cinema.style !== "photorealiste" ? DESCRIPTEUR_DU_STYLE[cinema.style] : undefined;
  if (style) morceaux.push(style);
  morceaux.push(AMBIANCE[spec.direction ?? "marque"]);
  // La palette de la série remplace celle de la marque quand elle est
  // décrite : elle porte l'usage par couleur, pas juste trois teintes.
  morceaux.push(cinema.palette ? enPhrase(cinema.palette) : `Color palette: ${paletteEnMots([encre, accent, clair])}.`);
  morceaux.push("Shallow depth of field, slow camera movement, 35mm film look.");
  morceaux.push("Audio: dialogue and natural ambient room tone only. No background music, no score, no soundtrack of any kind.");
  const communSelonLeStyle = cinema.style && STYLES_SANS_INTERDIT_CARTOON.has(cinema.style) ? NEGATIF_COMMUN.replace(", cartoon", "") : NEGATIF_COMMUN;
  const base = plan.objet ? communSelonLeStyle : `${communSelonLeStyle}, ${NEGATIF_SANS_OBJET}`;
  const negatif = cinema.negatif ? `${base}, ${cinema.negatif}` : base;
  return { prompt: morceaux.join(" "), negatif };
}

/**
 * Le prompt pour ANIMER une image fixe déjà approuvée (plan-still.ts) : juste
 * le mouvement de caméra et la réplique exacte, jamais la mise en scène
 * (posture, décor, « no villain caricature »…) déjà fixée dans l'image —
 * la répéter en mots en plus de l'image semble pousser le filtre de Google à
 * bloquer plus souvent (constaté sur plan-ep1-03, 06/11/2026).
 */
export function composerLePromptDAnimation(spec: Pick<FilmSpec, "marque" | "direction" | "cinema">, scene: SceneDeCinema, plan: PlanDeCinema): PromptDeVeo {
  const cinema = spec.cinema;
  if (!cinema) throw new Error("composerLePromptDAnimation : la fiche n'a pas de « cinema »");
  const morceaux = ["Animate this approved reference image exactly as composed — characters, costumes, decor and props are already fixed, never redesign, never add or remove anyone."];
  if (plan.replique) {
    const orateur = personnagesDuPlan(cinema, plan).find((personnage) => personnage.id === plan.replique?.personnage);
    if (orateur) {
      morceaux.push(
        `${orateur.nom} speaks ONLY this exact line, in FRENCH, word for word, with natural lip movement matching the French words — never translate it, never improvise different words, never speak English: « ${plan.replique.texte.trim()} »`,
      );
    }
  } else {
    morceaux.push("No one in this shot speaks any audible dialogue. Any background chatter stays an indistinct murmur, never clear English words.");
  }
  morceaux.push("Audio: dialogue and natural ambient room tone only. No background music, no score, no soundtrack of any kind.");
  const communSelonLeStyle = cinema.style && STYLES_SANS_INTERDIT_CARTOON.has(cinema.style) ? NEGATIF_COMMUN.replace(", cartoon", "") : NEGATIF_COMMUN;
  const negatif = cinema.negatif ? `${communSelonLeStyle}, ${cinema.negatif}` : communSelonLeStyle;
  return { prompt: morceaux.join(" "), negatif };
}
