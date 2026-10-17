import { AbsoluteFill, useVideoConfig } from "remotion";

import { transparence } from "../../marque/couleurs";
import { useCouleurs } from "../../marque/MarqueDuFilm";
import { type PropsDuDecor, useBattement } from "./battement";

/**
 * « Vinyle » : un disque qui tourne à 33 tours, son étiquette aux couleurs de
 * l'artiste, et un halo qui respire sur le temps. Placé en haut : les paroles
 * gardent le bas de l'image.
 */
export function Vinyle(props: PropsDuDecor) {
  const couleurs = useCouleurs();
  const { width: largeur, height: hauteur } = useVideoConfig();
  const { secondes, battement } = useBattement(props);
  const rayon = Math.min(largeur, hauteur) * (largeur > hauteur ? 0.3 : 0.36);
  const cx = largeur / 2;
  const cy = hauteur * (largeur > hauteur ? 0.4 : 0.36);
  const angle = (secondes * 360 * 33.3) / 60;
  return (
    <AbsoluteFill>
      <svg width={largeur} height={hauteur}>
        <rect width={largeur} height={hauteur} fill={couleurs.encre} />
        <circle cx={cx} cy={cy} r={rayon * (1.35 + 0.05 * battement)} fill={transparence(couleurs.accent, 0.1 + 0.08 * battement)} />
        <g transform={`rotate(${angle} ${cx} ${cy})`}>
          <circle cx={cx} cy={cy} r={rayon} fill="#0A0A0A" />
          {Array.from({ length: 14 }, (_, i) => (
            <circle key={i} cx={cx} cy={cy} r={rayon * (0.42 + i * 0.04)} fill="none" stroke={transparence(couleurs.clair, i % 3 === 0 ? 0.14 : 0.06)} strokeWidth={1.5} />
          ))}
          <path d={`M ${cx} ${cy - rayon} A ${rayon} ${rayon} 0 0 1 ${cx + rayon * 0.7} ${cy - rayon * 0.7}`} fill="none" stroke={transparence(couleurs.clair, 0.25)} strokeWidth={6} />
          <circle cx={cx} cy={cy} r={rayon * 0.34} fill={couleurs.accent} />
          <circle cx={cx} cy={cy} r={rayon * 0.26} fill="none" stroke={transparence(couleurs.clair, 0.4)} strokeWidth={2} />
          <rect x={cx - rayon * 0.12} y={cy - rayon * 0.2} width={rayon * 0.24} height={rayon * 0.05} fill={couleurs.clair} />
          <circle cx={cx} cy={cy} r={rayon * 0.03} fill={couleurs.encre} />
        </g>
      </svg>
    </AbsoluteFill>
  );
}
