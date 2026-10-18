import { Easing, useCurrentFrame } from "remotion";

import { transparence } from "../../marque/couleurs";
import { useCouleurs } from "../../marque/MarqueDuFilm";
import type { Format } from "../../lib/format";
import { GLISSE, entre, progression } from "../../lib/mouvement";
import { imageDuTemps } from "../../lib/tempo";
import type { Instant } from "../instants";
import type { FigureDuConte } from "../spec";
import { CHUTE, CONSTAT, SAUF, SCENES, SOLUTION, idDAvantage, placeAuSol, placeEnOrbite } from "../trame";
import { Figure } from "./Figure";
import { Glace } from "./Glace";

type Props = {
  heros: FigureDuConte;
  objets: FigureDuConte[];
  avantages: number;
  tampon: string;
  format: Format;
  tempo: number;
  instant: Instant;
};

const TOMBE = Easing.bezier(0.55, 0, 1, 0.45);
// Un tour complet de l'orbite en 16 temps : assez lent pour lire les objets.
const TEMPS_PAR_TOUR = 16;

/** Le héros au centre, la glace qui le fige, et les objets : tombés, puis en orbite. */
export function Personnages({ heros, objets, avantages, tampon, format, tempo, instant }: Props) {
  const couleurs = useCouleurs();
  const image = useCurrentFrame();
  const s = SCENES[format];
  const rangement = instant("solution", SOLUTION.rangement);
  const versLOrbite = progression(image, rangement, imageDuTemps(SOLUTION.dureeDeRangement, tempo), GLISSE);
  const tour = Math.max(0, image - rangement) / imageDuTemps(TEMPS_PAR_TOUR, tempo);
  const fige = image >= instant("constat", CONSTAT.glace) && image < instant("sauf", SAUF.fonte + SAUF.dureeDeFonte);
  const respiration = fige ? 0 : Math.sin(image / 14) * 6;
  // L'objet mis en avant pendant chaque avantage (le premier pour le premier, etc.).
  const misEnAvant = Array.from({ length: avantages }, (_, i) => i).find(
    (i) => image >= instant(idDAvantage(i)) && image < instant(idDAvantage(i), 8),
  );
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: s.largeur / 2 - s.heros / 2,
          top: s.sol - s.heros - 10,
          width: s.heros,
          height: s.heros,
          background: `radial-gradient(circle, ${transparence(couleurs.accent, 0.5 * versLOrbite)}, transparent 65%)`,
          transform: `translateY(${respiration}px)`,
        }}
      >
        <Figure figure={heros} taille={s.heros} />
      </div>
      <Glace format={format} tempo={tempo} instant={instant} tampon={tampon} />
      {objets.map((objet, index) => {
        const atterrissage = instant("chute", CHUTE.premierAtterrissage + index);
        const depart = atterrissage - imageDuTemps(CHUTE.dureeDeChute, tempo);
        if (image < depart) return null;
        const sol = placeAuSol(index, format);
        const chute = progression(image, depart, atterrissage - depart, TOMBE);
        const auSol = { x: sol.x, y: entre(-s.objet, sol.y, chute) };
        const orbite = placeEnOrbite(index, objets.length, tour, format);
        const x = entre(auSol.x, orbite.x, versLOrbite);
        const y = entre(auSol.y, orbite.y, versLOrbite);
        // Un tassement de 6 images à l'atterrissage : l'objet a du poids.
        const tasse = image >= atterrissage && image < atterrissage + 6 ? 1 - Math.sin(((image - atterrissage) / 6) * Math.PI) * 0.15 : 1;
        const echelle = misEnAvant !== undefined && misEnAvant % objets.length === index ? 1.3 : 1;
        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: x - s.objet / 2,
              top: y - s.objet / 2,
              transform: `scale(${echelle * (2 - tasse)}, ${echelle * tasse})`,
              transformOrigin: "50% 100%",
            }}
          >
            <Figure figure={objet} taille={s.objet} enTuile />
          </div>
        );
      })}
    </>
  );
}
