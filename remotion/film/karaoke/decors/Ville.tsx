import { AbsoluteFill, useVideoConfig } from "remotion";

import { transparence } from "../../marque/couleurs";
import { useCouleurs } from "../../marque/MarqueDuFilm";
import { type PropsDuDecor, aleatoireFixe, useBattement } from "./battement";

/**
 * « Ville » : une ligne d'immeubles sous un ciel de nuit. À chaque temps, des
 * fenêtres s'allument et d'autres s'éteignent (tirées d'une suite fixe : le
 * même rendu à chaque fois), et une enseigne d'accent pulse sur le temps fort.
 */
export function Ville(props: PropsDuDecor) {
  const couleurs = useCouleurs();
  const { width: largeur, height: hauteur } = useVideoConfig();
  const { indexDuTemps, battement } = useBattement(props);
  const sol = hauteur * (largeur > hauteur ? 0.72 : 0.62);
  const forme = aleatoireFixe(11);
  const immeubles: { x: number; l: number; h: number }[] = [];
  for (let x = -20; x < largeur + 20; ) {
    const l = 70 + forme() * 120;
    immeubles.push({ x, l, h: 160 + forme() * (sol * 0.55) });
    x += l + 6;
  }
  const lumieres = aleatoireFixe(1000 + (indexDuTemps % 64));
  return (
    <AbsoluteFill>
      <svg width={largeur} height={hauteur}>
        <defs>
          <linearGradient id="ciel-ville" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={couleurs.encre} />
            <stop offset="1" stopColor={transparence(couleurs.accent, 0.4)} />
          </linearGradient>
        </defs>
        <rect width={largeur} height={hauteur} fill={couleurs.encre} />
        <rect width={largeur} height={sol} fill="url(#ciel-ville)" />
        {immeubles.map((b, i) => (
          <g key={i}>
            <rect x={b.x} y={sol - b.h} width={b.l} height={b.h} fill={couleurs.encre} stroke={transparence(couleurs.accent, 0.35)} strokeWidth={1.5} />
            {Array.from({ length: Math.floor((b.h - 30) / 34) }, (_, r) =>
              Array.from({ length: Math.floor((b.l - 16) / 26) }, (_, c) => (
                <rect key={`${r}-${c}`} x={b.x + 10 + c * 26} y={sol - b.h + 18 + r * 34} width={14} height={18}
                  fill={lumieres() > 0.62 ? transparence(couleurs.accentSurSombre, 0.85) : transparence(couleurs.clair, 0.06)} />
              )),
            )}
          </g>
        ))}
        <rect x={0} y={sol} width={largeur} height={hauteur - sol} fill={couleurs.encre} />
        <rect x={0} y={sol} width={largeur} height={4} fill={transparence(couleurs.accent, 0.5 + 0.5 * battement)} />
        <rect x={0} y={sol + 4} width={largeur} height={(hauteur - sol) * 0.5} fill={transparence(couleurs.accent, 0.12 * battement)} />
      </svg>
    </AbsoluteFill>
  );
}
