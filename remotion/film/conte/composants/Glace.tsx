import { useCurrentFrame } from "remotion";

import { transparence } from "../../marque/couleurs";
import { useCouleurs } from "../../marque/MarqueDuFilm";
import type { Format } from "../../lib/format";
import { progression } from "../../lib/mouvement";
import { imageDuTemps } from "../../lib/tempo";
import type { Instant } from "../instants";
import { CONSTAT, SAUF, SCENES } from "../trame";

type Props = { format: Format; tempo: number; instant: Instant; tampon: string };

/**
 * Le bloc de glace qui fige le héros (il monte depuis le sol), le tampon qui
 * s'écrase dessus, puis la fonte au « Sauf un ». Révélé par un masque, jamais
 * par une opacité d'élément (mosaïque Remotion).
 */
export function Glace({ format, tempo, instant, tampon }: Props) {
  const couleurs = useCouleurs();
  const image = useCurrentFrame();
  const s = SCENES[format];
  const montee = progression(image, instant("constat", CONSTAT.glace), imageDuTemps(1, tempo));
  const fonte = progression(image, instant("sauf", SAUF.fonte), imageDuTemps(SAUF.dureeDeFonte, tempo));
  if (montee === 0 || fonte === 1) return null;
  const debutTampon = instant("constat", CONSTAT.tampon);
  const ecrase = progression(image, debutTampon, 8);
  const largeur = s.heros * 1.35;
  const hauteur = s.heros * 1.25;
  return (
    <div
      style={{
        position: "absolute",
        left: s.largeur / 2 - largeur / 2,
        top: s.sol - hauteur,
        width: largeur,
        height: hauteur,
        // Monte depuis le sol, puis fond par le haut.
        clipPath: `inset(${Math.max((1 - montee) * 100, fonte * 100)}% 0 0 0 round 22px)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 22,
          background: `linear-gradient(135deg, ${transparence(couleurs.clair, 0.55)}, ${transparence(couleurs.accentSurSombre, 0.35)})`,
          border: `3px solid ${transparence(couleurs.clair, 0.85)}`,
        }}
      />
      {image >= debutTampon ? (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              transform: `rotate(-12deg) scale(${2.4 - 1.4 * ecrase})`,
              padding: "8px 24px",
              border: `7px solid ${couleurs.accentSurClair}`,
              borderRadius: 12,
              background: couleurs.clair,
              color: couleurs.accentSurClair,
              fontSize: 56,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            {tampon}
          </div>
        </div>
      ) : null}
    </div>
  );
}
