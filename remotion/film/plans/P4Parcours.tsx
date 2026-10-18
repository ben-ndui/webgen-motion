import { AbsoluteFill, useCurrentFrame } from "remotion";

import { Revele } from "../composants/Revele";
import { Appareil, useDimensionsDeLAppareil } from "../composants/Appareil";
import { DecorDeDirection } from "../composants/DecorDeDirection";
import { useCouleurs, useSurface } from "../marque/MarqueDuFilm";
import { MARGE_PORTRAIT, RESERVE_HAUT, useFormat } from "../lib/format";
import { GLISSE, entre, progression } from "../lib/mouvement";
import { imageDuTemps } from "../lib/tempo";
import { MARGE, PHRASE } from "../lib/typo";
import { ENTREE_DE_LEGENDE, TEMPS_PAR_ETAPE } from "../reperes";
import type { EcransDuFilm, TextesDuFilm } from "../spec";

type Props = {
  tempo: number;
  legendes: TextesDuFilm["parcours"];
  ecrans: EcransDuFilm["parcours"];
  dossierDesEcrans: string;
};

// Les quatre écrans sont posés sur une route inclinée à 60° (l'angle du
// glissement) : la caméra avance le long de la route, un écran après
// l'autre. `foyer` est l'endroit du cadre où se tient l'écran regardé.
const MISE_EN_PAGE = {
  paysage: { largeur: 470, pas: 1000, foyer: { x: 1300, y: 540 }, legende: { left: MARGE, top: 480 } },
  // En 9:16, les voisins sont plus loin : l'écran regardé prend presque toute
  // la hauteur, et la légende passe au-dessus, sous la réserve des réseaux.
  portrait: {
    largeur: 560,
    pas: 1300,
    foyer: { x: 540, y: 1180 },
    legende: { left: MARGE_PORTRAIT, top: RESERVE_HAUT + 10 },
  },
} as const;

/**
 * Plan 4, le parcours : quatre VRAIES captures, une légende par étape. La
 * caméra glisse le long de la route ; l'écran regardé est à taille pleine,
 * ses voisins un peu en retrait.
 */
export function P4Parcours({ tempo, legendes, ecrans, dossierDesEcrans }: Props) {
  const couleurs = useCouleurs();
  const surface = useSurface("clair");
  const image = useCurrentFrame();
  const temps = (n: number) => imageDuTemps(n, tempo);
  const { largeur, pas, foyer, legende: placeDeLaLegende } = MISE_EN_PAGE[useFormat()];
  const { largeur: largeurReelle, hauteur } = useDimensionsDeLAppareil(largeur);
  const pasX = pas * Math.cos(Math.PI / 3);
  const pasY = -pas * Math.sin(Math.PI / 3);

  // Position de la caméra, en « nombre d'écrans parcourus » (fractionnaire).
  let position = 0;
  for (let etape = 1; etape < ecrans.length; etape += 1) {
    position += progression(image, temps(etape * TEMPS_PAR_ETAPE) - temps(1), temps(1), GLISSE);
  }

  const cameraX = foyer.x - position * pasX;
  const cameraY = foyer.y - position * pasY;

  return (
    <AbsoluteFill style={{ background: surface.fond, overflow: "hidden" }}>
      <DecorDeDirection surface={surface} />
      <div style={{ position: "absolute", left: cameraX, top: cameraY }}>
        <svg style={{ position: "absolute", overflow: "visible", left: 0, top: 0 }} width={1} height={1}>
          <line
            x1={-pasX}
            y1={-pasY}
            x2={pasX * ecrans.length}
            y2={pasY * ecrans.length}
            stroke={couleurs.accent}
            strokeWidth={4}
            strokeLinecap="round"
          />
        </svg>
        {ecrans.map((ecran, index) => {
          const distance = Math.min(1, Math.abs(position - index));
          const echelle = entre(1, 0.84, distance);
          return (
            <div
              key={ecran}
              style={{
                position: "absolute",
                left: index * pasX - largeurReelle / 2,
                top: index * pasY - hauteur / 2,
                transform: `scale(${echelle})`,
              }}
            >
              {/* Filmé, l'écran défile quand la caméra arrive sur lui. */}
              <Appareil ecran={`${dossierDesEcrans}/${ecran}`} largeur={largeur} debut={Math.max(0, temps(index * TEMPS_PAR_ETAPE) - temps(1))} />
            </div>
          );
        })}
      </div>

      <div style={{ position: "absolute", ...placeDeLaLegende }}>
        {legendes.map((legende, index) => {
          const debut = temps(index * TEMPS_PAR_ETAPE + ENTREE_DE_LEGENDE);
          const derniere = index === legendes.length - 1;
          const sortie = derniere ? undefined : temps((index + 1) * TEMPS_PAR_ETAPE) - temps(1);
          return (
            <div key={legende} style={{ position: "absolute", left: 0, top: 0, whiteSpace: "nowrap" }}>
              <Revele taille={84} debut={debut} sortie={sortie}>
                <span style={{ ...PHRASE, fontSize: 84, fontWeight: 500, ...surface.titre, color: surface.texte }}>{legende}</span>
              </Revele>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
