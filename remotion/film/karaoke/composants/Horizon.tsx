import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import { transparence } from "../../marque/couleurs";
import { useCouleurs } from "../../marque/MarqueDuFilm";

type Props = { tempo: number; premierTemps: number; debutDuPassage: number };

/**
 * Le décor « horizon » : un ciel, un soleil rayé posé sur l'horizon, et une
 * grille en perspective qui avance d'une ligne par temps. Le soleil bat sur
 * le temps fort. Tout dans la palette de l'artiste, sans teinte inventée.
 */
export function Horizon({ tempo, premierTemps, debutDuPassage }: Props) {
  const couleurs = useCouleurs();
  const image = useCurrentFrame();
  const { width: largeur, height: hauteur, fps } = useVideoConfig();
  // Le temps du MORCEAU (pas de la vidéo) : le décor reste calé si le passage commence au milieu.
  const t = debutDuPassage + image / fps;
  const temps = Math.max(0, ((t - premierTemps) * tempo) / 60);
  const dansLeTemps = temps - Math.floor(temps);
  const battement = Math.max(0, 1 - dansLeTemps * 4);
  const horizon = hauteur * (largeur > hauteur ? 0.56 : 0.5);
  const rayon = Math.min(largeur, hauteur) * (largeur > hauteur ? 0.26 : 0.34) * (1 + 0.025 * battement);
  const centre = largeur / 2;
  const lignes = 12;
  return (
    <AbsoluteFill>
      <svg width={largeur} height={hauteur}>
        <defs>
          <linearGradient id="ciel-k" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={couleurs.encre} />
            <stop offset="1" stopColor={transparence(couleurs.accent, 0.55)} />
          </linearGradient>
          <linearGradient id="soleil" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={couleurs.accentSurSombre} />
            <stop offset="1" stopColor={couleurs.accent} />
          </linearGradient>
          <clipPath id="haut-du-soleil">
            <rect x={0} y={0} width={largeur} height={horizon} />
          </clipPath>
        </defs>
        <rect width={largeur} height={hauteur} fill={couleurs.encre} />
        <rect width={largeur} height={horizon} fill="url(#ciel-k)" />
        <g clipPath="url(#haut-du-soleil)">
          <circle cx={centre} cy={horizon} r={rayon} fill="url(#soleil)" />
          {/* Les rayures du bas du soleil, de plus en plus larges vers l'horizon. */}
          {Array.from({ length: 6 }, (_, i) => {
            const y = horizon - rayon * 0.45 + i * rayon * 0.09;
            return <rect key={i} x={centre - rayon} y={y} width={rayon * 2} height={2 + i * 3} fill={couleurs.encre} />;
          })}
        </g>
        <rect x={0} y={horizon} width={largeur} height={hauteur - horizon} fill={couleurs.encre} />
        {/* La grille : des lignes de fuite, et des lignes qui avancent d'un pas par temps. */}
        {Array.from({ length: 21 }, (_, i) => {
          const x = centre + (i - 10) * (largeur / 6);
          return <line key={`f${i}`} x1={centre} y1={horizon} x2={x} y2={hauteur} stroke={transparence(couleurs.accent, 0.5)} strokeWidth={2} />;
        })}
        {Array.from({ length: lignes }, (_, i) => {
          const avance = (i + dansLeTemps) / lignes;
          const y = horizon + (hauteur - horizon) * avance * avance;
          return <line key={`h${i}`} x1={0} y1={y} x2={largeur} y2={y} stroke={transparence(couleurs.accent, 0.25 + 0.5 * avance)} strokeWidth={1 + 3 * avance} />;
        })}
        <line x1={0} y1={horizon} x2={largeur} y2={horizon} stroke={couleurs.accentSurSombre} strokeWidth={3} />
      </svg>
    </AbsoluteFill>
  );
}
