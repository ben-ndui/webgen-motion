import { AbsoluteFill, useVideoConfig } from "remotion";

import { transparence } from "../../marque/couleurs";
import { useCouleurs } from "../../marque/MarqueDuFilm";
import { type PropsDuDecor, useBattement } from "./battement";

/**
 * « Océan » : une lune au-dessus de quatre rangs de vagues qui roulent, plus
 * hautes sur le temps fort. Les vagues avancent avec le temps du MORCEAU.
 */
export function Ocean(props: PropsDuDecor) {
  const couleurs = useCouleurs();
  const { width: largeur, height: hauteur } = useVideoConfig();
  const { temps, battement } = useBattement(props);
  const mer = hauteur * (largeur > hauteur ? 0.58 : 0.5);
  const lune = Math.min(largeur, hauteur) * 0.12;
  const vague = (rang: number) => {
    const base = mer + rang * (hauteur - mer) * 0.22;
    const amplitude = 10 + rang * 6 + 10 * battement;
    const longueur = 260 + rang * 90;
    const decalage = temps * (40 + rang * 25);
    const points = [`0,${hauteur}`];
    for (let x = 0; x <= largeur; x += 16) points.push(`${x},${base + Math.sin((x + decalage) / longueur * Math.PI * 2) * amplitude}`);
    points.push(`${largeur},${hauteur}`);
    return points.join(" ");
  };
  return (
    <AbsoluteFill>
      <svg width={largeur} height={hauteur}>
        <defs>
          <linearGradient id="ciel-ocean" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={couleurs.encre} />
            <stop offset="1" stopColor={transparence(couleurs.accent, 0.3)} />
          </linearGradient>
        </defs>
        <rect width={largeur} height={hauteur} fill="url(#ciel-ocean)" />
        <circle cx={largeur * 0.72} cy={mer * 0.42} r={lune * 2.2} fill={transparence(couleurs.accentSurSombre, 0.12 + 0.1 * battement)} />
        <circle cx={largeur * 0.72} cy={mer * 0.42} r={lune} fill={couleurs.accentSurSombre} />
        <rect x={largeur * 0.72 - lune * 0.6} y={mer} width={lune * 1.2} height={hauteur - mer} fill={transparence(couleurs.accentSurSombre, 0.18)} />
        {[0, 1, 2, 3].map((rang) => (
          <polygon key={rang} points={vague(rang)} fill={rang === 3 ? couleurs.encre : transparence(couleurs.encre, 0.55 + rang * 0.12)}
            stroke={transparence(couleurs.accent, 0.45)} strokeWidth={2} />
        ))}
      </svg>
    </AbsoluteFill>
  );
}
