import { useCurrentFrame } from "remotion";

import { useCouleurs } from "../../marque/MarqueDuFilm";
import { progression } from "../../lib/mouvement";
import { LIBELLE } from "../../lib/typo";

type Props = { texte: string; debut: number; haut: number };

/**
 * La pastille de chapitre, en haut et au centre : elle se déroule depuis son
 * milieu (un masque, pas une opacité).
 */
export function Pastille({ texte, debut, haut }: Props) {
  const couleurs = useCouleurs();
  const image = useCurrentFrame();
  const ouverture = progression(image, debut, 14);
  const cache = (1 - ouverture) * 50;
  return (
    <div style={{ position: "absolute", top: haut, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          ...LIBELLE,
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: "0.12em",
          color: couleurs.encre,
          background: couleurs.accentSurSombre,
          padding: "10px 26px",
          borderRadius: 999,
          clipPath: `inset(0 ${cache}% 0 ${cache}% round 999px)`,
        }}
      >
        {texte}
      </div>
    </div>
  );
}
