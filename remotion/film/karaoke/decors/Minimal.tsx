import { AbsoluteFill, useVideoConfig } from "remotion";

import { transparence } from "../../marque/couleurs";
import { useCouleurs } from "../../marque/MarqueDuFilm";
import { type PropsDuDecor, useBattement } from "./battement";

/**
 * « Minimal » : un aplat, un grand disque d'accent qui pulse sur le temps, une
 * trame fine. Les paroles passent au CENTRE, en très grand (voir Paroles) :
 * ici, ce sont elles le décor.
 */
export function Minimal(props: PropsDuDecor) {
  const couleurs = useCouleurs();
  const { width: largeur, height: hauteur } = useVideoConfig();
  const { battement, indexDuTemps } = useBattement(props);
  const rayon = Math.min(largeur, hauteur) * (0.32 + 0.03 * battement);
  // Le disque change de côté à chaque mesure (4 temps) : l'image bouge sans distraire.
  const cote = Math.floor(indexDuTemps / 4) % 2 === 0 ? 0.3 : 0.7;
  return (
    <AbsoluteFill>
      <svg width={largeur} height={hauteur}>
        <rect width={largeur} height={hauteur} fill={couleurs.encre} />
        {Array.from({ length: Math.ceil(largeur / 80) }, (_, i) => (
          <line key={i} x1={i * 80} y1={0} x2={i * 80} y2={hauteur} stroke={transparence(couleurs.clair, 0.04)} strokeWidth={1} />
        ))}
        {/* Atténué : les paroles passent DESSUS, en accent pour la partie chantée (illisible sur un disque plein). */}
        <circle cx={largeur * cote} cy={hauteur * 0.5} r={rayon} fill={transparence(couleurs.accent, 0.3)} />
      </svg>
    </AbsoluteFill>
  );
}
