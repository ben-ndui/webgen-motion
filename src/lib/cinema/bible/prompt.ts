import type { StyleVisuel } from "../../../../remotion/film/cinema/types";
import { RENDU_DE_REFERENCE } from "../styles";
import type { ReferenceDeLaSerie, VueDeReference } from "./etat";

/**
 * Le prompt d'une vue de la bible, envoyé à Gemini (image). Pur : l'écran et
 * la génération l'utilisent pareil. Même recette que l'ancien portrait du
 * 14/10 (fond neutre : Veo copiait sinon la pose et le fond du portrait).
 *
 * Le fond neutre ne vaut QUE pour un objet (comme une photo produit isolée) :
 * un décor EST le fond. Lui imposer un studio gris contredit sa propre
 * description (architecture, lumière, ambiance) et rend l'image de référence
 * plate — ce qui se voit ensuite dans les plans qui la citent. 18/10/2026.
 *
 * Le RENDU (photoréaliste par défaut, ou le style de la série) remplace
 * seulement l'adjectif de tête : le reste de la recette ne bouge pas, pour
 * qu'une bible déjà en cours garde des images cohérentes entre elles.
 */
const RENDU_PAR_DEFAUT = "Photorealistic";

function rendu(style: StyleVisuel | undefined): string {
  if (!style || style === "photorealiste") return RENDU_PAR_DEFAUT;
  return RENDU_DE_REFERENCE[style] ?? RENDU_PAR_DEFAUT;
}

function cadrageDuPersonnage(vue: Exclude<VueDeReference, "image">, r: string): string {
  const CADRAGE: Record<Exclude<VueDeReference, "image">, string> = {
    face: `${r} character reference, head and shoulders, facing directly towards the camera`,
    "trois-quarts": `${r} character reference, head and shoulders, three-quarter angle view (about 45 degrees)`,
    profil: `${r} character reference, head and shoulders, exact side profile view (90 degrees)`,
    "en-pied": `${r} full-body character reference, standing, front view, arms relaxed`,
  };
  return CADRAGE[vue];
}

const FOND_NEUTRE = "even soft studio light, plain light grey seamless studio background";
const SANS_PARASITE = "No props, no text, no logo.";

export function promptDeLaVue(reference: Pick<ReferenceDeLaSerie, "type" | "description">, vue: VueDeReference, style?: StyleVisuel, negatif?: string): string {
  const description = reference.description.trim();
  const r = rendu(style);
  const eviter = negatif ? ` Avoid: ${negatif.trim()}.` : "";
  if (reference.type === "decor") {
    return `${r} wide establishing shot of this real location, showing its full environment and depth, with its own natural lighting and atmosphere. ${description} No people, no characters, no camera or film equipment visible. ${SANS_PARASITE}${eviter}`;
  }
  if (reference.type === "objet") {
    return `${r} reference image, ${FOND_NEUTRE}. ${description} ${SANS_PARASITE}${eviter}`;
  }
  const cadrage = cadrageDuPersonnage(vue as Exclude<VueDeReference, "image">, r);
  return `${cadrage}, ${FOND_NEUTRE}. ${description} Neutral calm expression, looking at the camera. Natural skin texture. ${SANS_PARASITE}${eviter}`;
}
