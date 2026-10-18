import { AbsoluteFill, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

import { transparence } from "../../marque/couleurs";
import { useCouleurs } from "../../marque/MarqueDuFilm";
import { progression } from "../../lib/mouvement";

// Une vidéo Veo dure 8 s ; elle se rejoue toutes les 7 s, et la nouvelle prise
// apparaît en fondu sur la seconde de recouvrement : la jointure ne se voit pas.
export const DUREE_DU_FOND = 8;
const RECOUVREMENT = 1;

/** Une prise de la boucle : la vidéo depuis son début, en fondu d'entrée (sauf la première). */
function Prise({ fichier, fondu }: { fichier: string; fondu: number }) {
  const image = useCurrentFrame();
  // Opacité SEULE, sans transformation : opacité + transformation font une mosaïque chez Remotion.
  const opacite = fondu === 0 ? 1 : progression(image, 0, fondu);
  return (
    <AbsoluteFill style={{ opacity: opacite }}>
      <OffthreadVideo src={staticFile(fichier)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </AbsoluteFill>
  );
}

/**
 * Le décor sur mesure : la vidéo générée, en boucle sur toute la durée, sous
 * un voile sombre dans les couleurs de l'artiste, plus dense en bas, là où
 * passent les paroles (une vidéo chargée les mangerait).
 */
export function SurMesure({ fichier }: { fichier: string }) {
  const couleurs = useCouleurs();
  const { fps, durationInFrames } = useVideoConfig();
  const pas = Math.round((DUREE_DU_FOND - RECOUVREMENT) * fps);
  const longueur = Math.round(DUREE_DU_FOND * fps);
  const prises = Math.ceil(durationInFrames / pas);
  return (
    <AbsoluteFill style={{ background: couleurs.encre }}>
      {Array.from({ length: prises }, (_, index) => (
        <Sequence key={index} from={index * pas} durationInFrames={longueur} name={`fond-${index + 1}`}>
          <Prise fichier={fichier} fondu={index === 0 ? 0 : Math.round(RECOUVREMENT * fps)} />
        </Sequence>
      ))}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${transparence(couleurs.encre, 0.15)} 0%, ${transparence(couleurs.encre, 0.25)} 45%, ${transparence(couleurs.encre, 0.85)} 100%)`,
        }}
      />
    </AbsoluteFill>
  );
}
