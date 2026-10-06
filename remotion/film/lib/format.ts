import { useVideoConfig } from "remotion";

// Le film existe en deux cadres : 16:9 (1920 × 1080, film principal) et 9:16
// (1080 × 1920, montage court pour les réseaux). Un plan qui se met en page
// différemment selon le cadre le lit ici, plutôt que de recevoir un drapeau
// de plus.
export type Format = "paysage" | "portrait";

export function useFormat(): Format {
  const { width, height } = useVideoConfig();
  return height > width ? "portrait" : "paysage";
}

// Marge latérale du cadre vertical : plus étroite que les 160 px du 16:9,
// la largeur utile n'y est que de 1080 px.
export const MARGE_PORTRAIT = 90;

// Zones que Reels, TikTok et Shorts recouvrent en 9:16 (pseudo en haut,
// légende et boutons en bas) : aucun TEXTE ne s'y pose. Mesurées sur le gig
// e-mail pro (fiverr-gigs/email-pro/film).
export const RESERVE_HAUT = 240;
export const RESERVE_BAS = 400;
