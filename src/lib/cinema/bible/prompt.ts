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
 */
const CADRAGE_DU_PERSONNAGE: Record<Exclude<VueDeReference, "image">, string> = {
  face: "Photorealistic character reference, head and shoulders, facing directly towards the camera",
  "trois-quarts": "Photorealistic character reference, head and shoulders, three-quarter angle view (about 45 degrees)",
  profil: "Photorealistic character reference, head and shoulders, exact side profile view (90 degrees)",
  "en-pied": "Photorealistic full-body character reference, standing, front view, arms relaxed",
};

const FOND_NEUTRE = "even soft studio light, plain light grey seamless studio background";
const SANS_PARASITE = "No props, no text, no logo.";

export function promptDeLaVue(reference: Pick<ReferenceDeLaSerie, "type" | "description">, vue: VueDeReference): string {
  const description = reference.description.trim();
  if (reference.type === "decor") {
    return `Photorealistic wide establishing shot of this real location, showing its full environment and depth, with its own natural lighting and atmosphere. ${description} No people, no characters, no camera or film equipment visible. ${SANS_PARASITE}`;
  }
  if (reference.type === "objet") {
    return `Photorealistic reference image, ${FOND_NEUTRE}. ${description} ${SANS_PARASITE}`;
  }
  const cadrage = CADRAGE_DU_PERSONNAGE[vue as Exclude<VueDeReference, "image">];
  return `${cadrage}, ${FOND_NEUTRE}. ${description} Neutral calm expression, looking at the camera. Natural skin texture. ${SANS_PARASITE}`;
}
