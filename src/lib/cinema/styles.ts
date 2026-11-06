import type { StyleVisuel } from "../../../remotion/film/cinema/types";

/**
 * Une phrase par style, ajoutée aux prompts d'image (bible) et de plan (Veo).
 * Absente pour « photorealiste » : c'est le rendu d'avant ce fichier, personne
 * n'y touche. Partagé entre bible/prompt.ts, prompt.ts et scenario-demande.ts
 * pour ne décrire chaque style qu'à un seul endroit.
 */
export const DESCRIPTEUR_DU_STYLE: Partial<Record<StyleVisuel, string>> = {
  "cinema-fantasy":
    "Epic cinematic fairytale fantasy film look. Warm golden light dominates every scene, even dark or dramatic ones — candlelight, molten-gold reflections, amber and ancient-gold tones; cold light (lightning, moonlight) is only a brief accent, never the dominant mood. Every costume, jewel and creature is majestic, opulent and richly detailed exactly as in its reference image — regal grandeur, never plain or understated.",
  "animation-3d": "High-quality stylized 3D animated film look.",
  illustration: "Painterly illustrated look, visible brush texture.",
  "manga-anime":
    "Japanese anime / manga cinematic art style: clean ink line art, cel-shaded colors, dramatic manga lighting and framing. Not photorealistic, not a 3D render, not a Western cartoon.",
};

// « cartoon » dans l'interdit commun irait CONTRE ces styles-là : ils
// dessinent délibérément, ce n'est pas un défaut à corriger.
export const STYLES_SANS_INTERDIT_CARTOON: ReadonlySet<StyleVisuel> = new Set(["manga-anime", "illustration", "animation-3d"]);

/**
 * Le même style, mais comme ADJECTIF DE TÊTE (« Photorealistic character
 * reference… ») pour les images de la bible visuelle : une phrase complète
 * comme DESCRIPTEUR_DU_STYLE s'y lirait mal en tête de phrase. Absent :
 * photoréaliste (le rendu d'avant ce fichier).
 */
export const RENDU_DE_REFERENCE: Partial<Record<StyleVisuel, string>> = {
  "animation-3d": "Stylized 3D animated",
  illustration: "Painterly illustrated",
  "manga-anime": "Japanese anime / manga style, clean ink line art, cel-shaded",
};
