import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";

import { DecorDeDirection } from "../composants/DecorDeDirection";
import { useCouleurs, useDirection, useSurface } from "../marque/MarqueDuFilm";
import { MARGE_PORTRAIT, useFormat } from "../lib/format";
import { ARRIVEE, GLISSE, entre, progression } from "../lib/mouvement";
import { imageDuTemps } from "../lib/tempo";
import { MARGE } from "../lib/typo";
import type { TextesDeLaBibliotheque } from "../spec";
import {
  caracteresDeLAnneau,
  caracteresPourLePerimetre,
  decouperLeMot,
  lettreDeFace,
  rayonPourLesCaracteres,
  tailleDuMot,
} from "./geometrie";

type Props = { tempo: number; textes: Pick<TextesDeLaBibliotheque, "mot" | "anneau"> };

const MISE_EN_PAGE = {
  // `rayon` : le rayon VISÉ ; le rayon réel s'ajuste à la phrase (geometrie).
  paysage: { largeurUtile: 1920 - 2 * MARGE, tailleMax: 260, rayon: 420, corpsAnneau: 64 },
  portrait: { largeurUtile: 1080 - 2 * MARGE_PORTRAIT, tailleMax: 230, rayon: 360, corpsAnneau: 56 },
} as const;
// Inclinaison de l'anneau vers le spectateur : assez pour lire l'ellipse,
// pas assez pour que les lettres de devant se couchent.
const INCLINAISON = -16;
// Un tour d'anneau en huit temps : lisible, sans donner le tournis.
const TEMPS_PAR_TOUR = 8;

/**
 * Typo cinétique, deux temps forts :
 * 1. le mot arrive lettre à lettre, chaque lettre sort d'une fente avec une
 *    déformation (biais, étirement) qui se résorbe en ressort ; la pastille
 *    d'accent tombe à la place du point final et rebondit ;
 * 2. le mot repart par la fente, la pastille retombe au centre, et la
 *    phrase tourne autour d'elle en anneau 3D. Les lettres de dos passent en nuance
 *    (couleur, jamais opacité : mosaïque Remotion).
 */
export function PTypoCinetique({ tempo, textes }: Props) {
  const direction = useDirection();
  const surface = useSurface("sombre");
  const { accent } = useCouleurs();
  const image = useCurrentFrame();
  const { fps } = useVideoConfig();
  const temps = (n: number) => imageDuTemps(n, tempo);
  const { largeurUtile, tailleMax, rayon, corpsAnneau } = MISE_EN_PAGE[useFormat()];

  const { lettres, pastilleAuPoint } = decouperLeMot(textes.mot);
  const taille = tailleDuMot(lettres.length + 1, largeurUtile, tailleMax);
  // Toutes les lettres posées en trois temps au plus, quelle que soit la longueur.
  const pasDeLettre = Math.min(temps(0.5), temps(3) / Math.max(1, lettres.length));
  const chuteDeLaPastille = Math.round(lettres.length * pasDeLettre) + temps(0.5);
  const departDuMot = temps(6);
  const sortieDuMot = progression(image, departDuMot, temps(1), GLISSE);

  const pastille = Math.round(taille * 0.2);
  const pastilleCentrale = Math.round(corpsAnneau * 0.7);
  // L'anneau n'arrive qu'une fois le mot sorti de sa fente : les deux ne se
  // croisent jamais à l'écran.
  const arriveeDeLAnneau = departDuMot + temps(1);
  const chuteAuCentre = arriveeDeLAnneau;
  const rebondDuMot = spring({ frame: image - chuteDeLaPastille, fps, config: { damping: 9, stiffness: 140 } });
  const rebondAuCentre = spring({ frame: image - chuteAuCentre, fps, config: { damping: 9, stiffness: 140 } });

  const ouvertureAnneau = progression(image, arriveeDeLAnneau, temps(2));
  const rotation = (2 * Math.PI * Math.max(0, image - departDuMot)) / temps(TEMPS_PAR_TOUR);
  const caracteres = caracteresDeLAnneau(textes.anneau, caracteresPourLePerimetre(rayon, corpsAnneau));
  const rayonReel = rayonPourLesCaracteres(caracteres.length, corpsAnneau);
  const boite = 2 * (rayonReel + corpsAnneau * 2);

  return (
    <AbsoluteFill style={{ background: surface.fond, alignItems: "center", justifyContent: "center" }}>
      <DecorDeDirection surface={surface} />
      {/* Le mot : une fente FIXE (le masque), d'où il sort lettre à lettre et
          par où il repart ; seule la ligne bouge dedans. */}
      <div style={{ overflow: "hidden", paddingTop: Math.round(taille * 0.35), paddingBottom: Math.round(taille * 0.2) }}>
        <div style={{ display: "flex", alignItems: "baseline", transform: `translateY(${-sortieDuMot * 160}%)` }}>
          {lettres.map((lettre, index) => {
            const debut = Math.round(index * pasDeLettre);
            const montee = progression(image, debut, temps(1), ARRIVEE);
            const ressort = spring({ frame: image - debut, fps, config: { damping: 11, stiffness: 120 } });
            return (
              <span
                key={`${lettre}-${index}`}
                style={{
                  display: "inline-block",
                  fontSize: taille,
                  fontWeight: direction.graisseDuMot,
                  lineHeight: 1,
                  letterSpacing: direction.interlettrageDuMot,
                  color: surface.texte,
                  whiteSpace: "pre",
                  transform: `translateY(${(1 - montee) * 120}%) skewX(${entre(-18, 0, ressort)}deg) scaleY(${entre(1.3, 1, ressort)})`,
                  transformOrigin: "bottom",
                }}
              >
                {lettre}
              </span>
            );
          })}
          {/* La case de la pastille, dans la ligne du mot : une case vide en
              ligne a sa base sur la ligne de base du texte, la pastille s'y
              assoit exactement, sans mesurer le mot. Elle tombe de la fente. */}
          <span
            style={{
              display: "inline-block",
              position: "relative",
              width: pastille * (pastilleAuPoint ? 1.3 : 1.8),
              height: pastille,
            }}
          >
            <span
              style={{
                position: "absolute",
                right: 0,
                bottom: 0,
                width: pastille,
                height: pastille,
                borderRadius: pastille,
                background: accent,
                transform: `translateY(${entre(-taille * 1.8, 0, rebondDuMot)}px)`,
                visibility: image < chuteDeLaPastille ? "hidden" : "visible",
              }}
            />
          </span>
        </div>
      </div>

      {/* Au centre de l'anneau, la même pastille retombe : même geste, deux fois. */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: pastilleCentrale,
          height: pastilleCentrale,
          marginLeft: -pastilleCentrale / 2,
          marginTop: -pastilleCentrale / 2,
          borderRadius: pastilleCentrale,
          background: accent,
          transform: `translateY(${entre(-900, 0, rebondAuCentre)}px)`,
          visibility: image < chuteAuCentre ? "hidden" : "visible",
        }}
      />

      {/* L'anneau : la phrase sur un cercle horizontal, vu un peu d'en haut. */}
      <div
        style={{
          position: "absolute",
          // Boîte qui contient tout l'anneau : un masque sur une boîte vide
          // couperait tout.
          left: `calc(50% - ${boite / 2}px)`,
          top: `calc(50% - ${boite / 2}px)`,
          width: boite,
          height: boite,
          perspective: 1800,
          // Découvert depuis la ligne du milieu, à son arrivée.
          clipPath: `inset(${(1 - ouvertureAnneau) * 50}% 0 ${(1 - ouvertureAnneau) * 50}% 0)`,
          visibility: ouvertureAnneau === 0 ? "hidden" : "visible",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: boite / 2,
            top: boite / 2,
            transformStyle: "preserve-3d",
            transform: `rotateX(${INCLINAISON}deg) rotateY(${rotation}rad)`,
          }}
        >
          {caracteres.map((caractere, index) => {
            const angle = (2 * Math.PI * index) / caracteres.length;
            return (
              <span
                key={index}
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  fontSize: corpsAnneau,
                  fontWeight: direction.graisseDeLAnneau,
                  lineHeight: 1,
                  whiteSpace: "pre",
                  color: lettreDeFace(angle, rotation) ? surface.texte : surface.texteDeDos,
                  transform: `translate(-50%, -50%) rotateY(${angle}rad) translateZ(${rayonReel}px)`,
                }}
              >
                {caractere}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}
