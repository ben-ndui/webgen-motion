import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import { transparence } from "../../marque/couleurs";
import { useCouleurs } from "../../marque/MarqueDuFilm";
import type { Format } from "../../lib/format";
import { SCENES } from "../trame";

type Props = { format: Format; teinte: number };

// Étoiles placées par une suite pseudo-aléatoire FIXE : la même image à chaque rendu.
function etoiles(nombre: number, largeur: number, hauteur: number) {
  let graine = 7;
  const suivant = () => {
    graine = (graine * 16807) % 2147483647;
    return graine / 2147483647;
  };
  return Array.from({ length: nombre }, () => ({ x: suivant() * largeur, y: suivant() * hauteur, r: 1 + suivant() * 2, phase: suivant() }));
}

/**
 * Le décor unique du conte, dans la palette fermée de la marque : un ciel
 * d'encre étoilé, deux chaînes de montagnes, un sol de neige. `teinte` (0 à 1)
 * baigne la scène dans l'accent quand le produit arrive.
 */
export function Decor({ format, teinte }: Props) {
  const couleurs = useCouleurs();
  const image = useCurrentFrame();
  const { width: largeur, height: hauteur } = useVideoConfig();
  const sol = SCENES[format].sol;
  const ciel = etoiles(format === "paysage" ? 70 : 60, largeur, sol - 200);
  const sommets = (base: number, nombre: number, decalage: number) => {
    const pas = largeur / nombre;
    const points = [`0,${base}`];
    for (let i = 0; i <= nombre; i += 1) {
      const pic = base - 160 - ((i * 37 + decalage) % 5) * 28;
      points.push(`${i * pas - pas / 2},${base}`, `${i * pas},${pic}`);
    }
    points.push(`${largeur},${base}`);
    return points.join(" ");
  };
  return (
    <AbsoluteFill>
      <svg width={largeur} height={hauteur}>
        <defs>
          <linearGradient id="ciel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={couleurs.encre} />
            <stop offset="1" stopColor={transparence(couleurs.accent, 0.35)} />
          </linearGradient>
          <radialGradient id="teinte" cx="0.5" cy="0.6" r="0.7">
            <stop offset="0" stopColor={transparence(couleurs.accent, 0.45 * teinte)} />
            <stop offset="1" stopColor={transparence(couleurs.accent, 0)} />
          </radialGradient>
        </defs>
        <rect width={largeur} height={hauteur} fill={couleurs.encre} />
        <rect width={largeur} height={hauteur} fill="url(#ciel)" />
        {ciel.map((etoile, i) => (
          <circle key={i} cx={etoile.x} cy={etoile.y} r={etoile.r}
            fill={transparence(couleurs.clair, 0.35 + 0.35 * Math.abs(Math.sin(image / 25 + etoile.phase * 6)))} />
        ))}
        <polygon points={sommets(sol - 60, format === "paysage" ? 7 : 4, 3)} fill={transparence(couleurs.clair, 0.08)} />
        <polygon points={sommets(sol - 10, format === "paysage" ? 5 : 3, 1)} fill={transparence(couleurs.clair, 0.14)} />
        <path d={`M0 ${sol - 20} Q ${largeur / 2} ${sol - 70} ${largeur} ${sol - 20} V ${hauteur} H 0 Z`} fill={couleurs.clair} />
        <rect width={largeur} height={hauteur} fill="url(#teinte)" />
      </svg>
    </AbsoluteFill>
  );
}
