import type { CSSProperties } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

import type { Langue } from "../spec";

type Props = {
  // Image où le vrai logo commence : les plans générés s'arrêtent là.
  debutDuLogo: number;
  // Un plan montre un objet imaginé par l'IA : le rendu n'est qu'un aperçu.
  objetImagine: boolean;
  langue: Langue;
};

const APERCU_EN: Record<Langue, string> = { fr: "APERÇU", en: "PREVIEW" };

const APERCU: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  textAlign: "center",
  fontSize: 150,
  fontWeight: 500,
  letterSpacing: "0.12em",
  color: "rgba(255,255,255,.16)",
};

/**
 * « APERÇU » par-dessus tout l'épisode tant qu'un objet du film est imaginé
 * par l'IA : ce n'est pas encore le vrai produit. Sur le logo, le filigrane
 * descend pour ne pas le couvrir (constaté sur la démo SAYA du 14/10).
 *
 * La mention « contenu généré par IA » n'est PAS incrustée (décision Ben,
 * 14/10) : elle se fait à la publication, par l'étiquette IA d'Instagram ou de
 * TikTok (AI Act art. 50) ; l'écran du rendu le rappelle.
 */
export function CalquesDeVerite({ debutDuLogo, objetImagine, langue }: Props) {
  const image = useCurrentFrame();
  if (!objetImagine) return null;
  const surLesPlans = image < debutDuLogo;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <span style={{ ...APERCU, top: surLesPlans ? "45%" : "72%" }}>{APERCU_EN[langue]}</span>
    </AbsoluteFill>
  );
}
