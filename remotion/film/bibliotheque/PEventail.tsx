import { AbsoluteFill, useCurrentFrame } from "remotion";

import { Revele } from "../composants/Revele";
import { Telephone, hauteurDuTelephone } from "../composants/Telephone";
import { useCouleurs } from "../marque/MarqueDuFilm";
import { MARGE_PORTRAIT, RESERVE_HAUT, useFormat } from "../lib/format";
import { ARRIVEE, GLISSE, entre, progression } from "../lib/mouvement";
import { imageDuTemps } from "../lib/tempo";
import { MARGE } from "../lib/typo";
import { placesDansLEventail } from "./geometrie";

type Props = {
  tempo: number;
  // Chemins dans public/ des vraies captures, 3 à 5.
  ecrans: string[];
  // Une légende par capture, dans le même ordre.
  legendes: string[];
};

// 16:9 : l'éventail à droite, les légendes en colonne à gauche.
// 9:16 : les légendes en haut, sous la réserve des réseaux ; l'éventail
// dessous, dont seuls des écrans (pas de texte) frôlent la réserve basse.
export const MISE_EN_PAGE_DE_L_EVENTAIL = {
  // Écran du bord, incliné autour de sa base : son coin haut s'écarte de
  // hauteur × sin(angle). Écarts et angles choisis pour qu'il reste dans le
  // cadre (et, en 16:9, hors de la colonne des légendes) à cinq écrans.
  paysage: {
    largeur: 280,
    centre: { x: 1310, y: 560 },
    eventail: { ecart: 140, angleMax: 14, creux: 30 },
    legendes: { left: MARGE, top: 330 },
    corps: 46,
    interligne: 82,
  },
  portrait: {
    // 360 et non 260 : à 260, cinq écrans laissaient la moitié du cadre vide.
    largeur: 360,
    centre: { x: 540, y: 1200 },
    eventail: { ecart: 92, angleMax: 9, creux: 22 },
    legendes: { left: MARGE_PORTRAIT, top: RESERVE_HAUT + 30 },
    corps: 40,
    interligne: 66,
  },
} as const;

/**
 * L'éventail : les vraies captures montent une à une, empilées, puis
 * s'ouvrent en éventail. Chaque légende arrive sur son temps et soulève son
 * écran : on sait toujours de quel écran on parle.
 */
export function PEventail({ tempo, ecrans, legendes }: Props) {
  const couleurs = useCouleurs();
  const image = useCurrentFrame();
  const temps = (n: number) => imageDuTemps(n, tempo);
  const mise = MISE_EN_PAGE_DE_L_EVENTAIL[useFormat()];
  const hauteur = hauteurDuTelephone(mise.largeur);

  const ouverture = progression(image, temps(3), temps(2), GLISSE);
  const places = placesDansLEventail(ecrans.length, ouverture, mise.eventail);
  // Première légende à l'ouverture de l'éventail, puis une par temps.
  const debutDeLegende = (index: number) => temps(4 + index);

  return (
    <AbsoluteFill style={{ background: couleurs.clair, overflow: "hidden" }}>
      {ecrans.map((ecran, index) => {
        const place = places[index]!;
        const arrivee = progression(image, temps(index * 0.5), temps(1.5), ARRIVEE);
        const enAvant =
          progression(image, debutDeLegende(index), temps(0.5), GLISSE) -
          progression(image, debutDeLegende(index + 1), temps(0.5), GLISSE);
        return (
          <div
            key={ecran}
            style={{
              position: "absolute",
              left: mise.centre.x - mise.largeur / 2,
              top: mise.centre.y - hauteur / 2,
              zIndex: place.plan,
              transformOrigin: "50% 100%",
              transform: [
                `translate(${place.x}px, ${place.y + entre(1400, 0, arrivee) - enAvant * 46}px)`,
                `rotate(${place.angle}deg)`,
              ].join(" "),
            }}
          >
            <Telephone ecran={ecran} largeur={mise.largeur} />
          </div>
        );
      })}

      <div style={{ position: "absolute", ...mise.legendes }}>
        {legendes.map((legende, index) => (
          <div
            key={legende}
            style={{ position: "absolute", left: 0, top: index * mise.interligne, whiteSpace: "nowrap" }}
          >
            <Revele taille={mise.corps} debut={debutDeLegende(index)}>
              <span style={{ fontSize: mise.corps, fontWeight: 500, color: couleurs.encre }}>
                <span style={{ color: couleurs.accentSurClair, marginRight: 22 }}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                {legende}
              </span>
            </Revele>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}
