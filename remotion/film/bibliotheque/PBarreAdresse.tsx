import { AbsoluteFill, useCurrentFrame } from "remotion";

import { DecorDeDirection } from "../composants/DecorDeDirection";
import { EcranReel } from "../composants/EcranReel";
import { useMarque, useSurface } from "../marque/MarqueDuFilm";
import { transparence } from "../marque/couleurs";
import { useFormat } from "../lib/format";
import { GLISSE, entre, progression } from "../lib/mouvement";
import { imageDuTemps } from "../lib/tempo";
import { caracteresTapes } from "./geometrie";

type Props = {
  tempo: number;
  adresse: string;
  // Chemin dans public/ de la capture du site (bureau, 16:9).
  ecran: string;
};

// La capture d'un site est en 16:9 (1600 × 900, comme celles du film S&D).
const RAPPORT_DU_SITE = 900 / 1600;
// En 9:16, la fenêtre reste au milieu : au-dessus de la réserve basse des
// réseaux (400 px) et sous la réserve haute (240 px), adresse comprise.
const MISE_EN_PAGE = {
  paysage: { largeur: 1180, hauteurBarre: 116, corps: 52, centre: 540 },
  portrait: { largeur: 940, hauteurBarre: 104, corps: 44, centre: 900 },
} as const;

/**
 * La barre d'adresse : l'adresse se tape lettre à lettre (un curseur bat la
 * mesure), on valide, et la fenêtre du site s'ouvre sous la barre sur la
 * VRAIE capture. La fenêtre grandit par sa hauteur (un masque), jamais par un
 * fondu.
 */
export function PBarreAdresse({ tempo, adresse, ecran }: Props) {
  const { couleurs, ombreTelephone } = useMarque();
  const surface = useSurface("sombre");
  const image = useCurrentFrame();
  const temps = (n: number) => imageDuTemps(n, tempo);
  const { largeur, hauteurBarre, corps, centre } = MISE_EN_PAGE[useFormat()];
  const hauteurSite = Math.round(largeur * RAPPORT_DU_SITE);

  const tapes = caracteresTapes(image, temps(1), temps(5), adresse.length);
  const validation = temps(6);
  // Le bouton s'enfonce sur le temps de la validation, puis revient.
  const appui = progression(image, validation, 4) - progression(image, validation + 4, 6);
  const ouverture = progression(image, validation + temps(0.5), temps(2), GLISSE);
  const derive = progression(image, validation + temps(0.5), temps(6));
  // Le curseur clignote au demi-temps, et disparaît une fois l'adresse validée.
  const curseurVisible = image < validation && Math.floor(image / temps(0.5)) % 2 === 0;

  // L'ensemble (barre + fenêtre) reste centré pendant que la fenêtre s'ouvre.
  const hauteurTotale = hauteurBarre + hauteurSite * ouverture;
  const haut = centre - hauteurTotale / 2;

  return (
    <AbsoluteFill style={{ background: surface.fond }}>
      <DecorDeDirection surface={surface} />
      <div
        style={{
          position: "absolute",
          left: `calc(50% - ${largeur / 2}px)`,
          top: haut,
          width: largeur,
          borderRadius: entre(hauteurBarre / 2, 28, ouverture),
          overflow: "hidden",
          background: couleurs.clair,
          boxShadow: ombreTelephone,
        }}
      >
        <div
          style={{
            height: hauteurBarre,
            display: "flex",
            alignItems: "center",
            gap: 24,
            padding: `0 ${Math.round(hauteurBarre * 0.22)}px 0 ${Math.round(hauteurBarre * 0.45)}px`,
            borderBottom: ouverture > 0 ? `2px solid ${transparence(couleurs.encre, 0.08)}` : undefined,
          }}
        >
          <span
            style={{
              flex: 1,
              fontSize: corps,
              fontWeight: 400,
              letterSpacing: "-0.01em",
              color: couleurs.encre,
              whiteSpace: "pre",
              overflow: "hidden",
            }}
          >
            {adresse.slice(0, tapes)}
            <span
              style={{
                display: "inline-block",
                width: 4,
                height: corps * 1.05,
                marginLeft: 4,
                verticalAlign: "middle",
                background: couleurs.accent,
                visibility: curseurVisible ? "visible" : "hidden",
              }}
            />
          </span>
          {/* Le bouton de validation : une flèche, la seule icône du plan. */}
          <div
            style={{
              width: hauteurBarre * 0.62,
              height: hauteurBarre * 0.62,
              borderRadius: hauteurBarre,
              background: couleurs.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `scale(${1 - appui * 0.12})`,
            }}
          >
            <svg width={hauteurBarre * 0.3} height={hauteurBarre * 0.3} viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M13 6l6 6-6 6" stroke={couleurs.clair} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
        <div style={{ height: hauteurSite * ouverture, overflow: "hidden" }}>
          <EcranReel
            fichier={ecran}
            debut={validation}
            style={{
              display: "block",
              width: largeur,
              height: hauteurSite,
              objectFit: "cover",
              objectPosition: "top",
              // Le site se pose : il arrive très légèrement agrandi.
              transform: `scale(${entre(1.06, 1, derive)})`,
              transformOrigin: "top",
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
}
