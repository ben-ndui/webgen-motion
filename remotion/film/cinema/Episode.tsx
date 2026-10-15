import { AbsoluteFill, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

import { PLogoConstruit } from "../bibliotheque/PLogoConstruit";
import { BandeSon } from "../composants/BandeSon";
import type { ProprietesDuFilm } from "../FilmPrincipal";
import { DIRECTION_PAR_DEFAUT, fondDuFilm } from "../marque/direction";
import { FournisseurDeMarque } from "../marque/MarqueDuFilm";
import { usePolice } from "../marque/police";
import { CalquesDeVerite } from "./CalquesDeVerite";
import { FONDU_DE_LA_MUSIQUE, FONDU_VERS_LE_LOGO, MUSIQUE_SOUS_UNE_REPLIQUE, type Morceau, monterLEpisode } from "./montage";

export type ProprietesDeLEpisode = ProprietesDuFilm & { episode: string };


function MorceauDePlan({ morceau }: { morceau: Morceau }) {
  const image = useCurrentFrame();
  const opacite = morceau.fondu > 0 ? interpolate(image, [0, morceau.fondu], [0, 1], { extrapolateRight: "clamp" }) : 1;
  return (
    <AbsoluteFill style={{ opacity: opacite }}>
      {/* Le son du plan reste : c'est là que le personnage parle. */}
      <OffthreadVideo src={staticFile(morceau.fichier)} trimBefore={morceau.depuis} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </AbsoluteFill>
  );
}

function EntreeDuLogo({ children }: { children: React.ReactNode }) {
  const opacite = interpolate(useCurrentFrame(), [0, FONDU_VERS_LE_LOGO], [0, 1], { extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: opacite }}>{children}</AbsoluteFill>;
}

/**
 * Un épisode de la série : ses plans générés, montés bout à bout (coupe
 * franche dans une scène, fondu entre deux), la musique de la marque baissée
 * sous chaque réplique, puis le vrai logo qui se construit avec la signature.
 * « APERÇU » reste tant qu'un objet est imaginé (CalquesDeVerite.tsx).
 */
export function Episode({ spec, declinaison, episode }: ProprietesDeLEpisode) {
  const police = usePolice(spec.marque.police);
  const { fps } = useVideoConfig();
  if (!spec.cinema) throw new Error("Episode : la fiche n'a pas de série (« cinema »).");
  const montage = monterLEpisode(spec.cinema, episode, spec.musique.tempo, fps);
  const textes = spec.textes[declinaison.langue];
  const signature = textes.bibliotheque?.signature ?? textes.bascule.signature;
  const repliques = montage.morceaux.filter((m) => m.replique).map((m) => ({ debut: m.debut, fin: m.debut + m.duree }));

  return (
    <FournisseurDeMarque marque={spec.marque} direction={spec.direction}>
      <AbsoluteFill style={{ background: fondDuFilm(spec.direction ?? DIRECTION_PAR_DEFAUT, spec.marque.couleurs), fontFamily: police }}>
        <BandeSon musique={spec.musique} fondu={FONDU_DE_LA_MUSIQUE} voix={repliques} sousLaVoix={MUSIQUE_SOUS_UNE_REPLIQUE} />
        {montage.morceaux.map((morceau, index) => (
          <Sequence key={`${morceau.planId}-${index}`} from={morceau.debut} durationInFrames={morceau.duree} name={morceau.planId}>
            <MorceauDePlan morceau={morceau} />
          </Sequence>
        ))}
        <Sequence from={montage.debutDuLogo} name="logo">
          <EntreeDuLogo>
            <PLogoConstruit tempo={spec.musique.tempo} signature={signature} />
          </EntreeDuLogo>
        </Sequence>
        <CalquesDeVerite debutDuLogo={montage.debutDuLogo} objetImagine={montage.objetImagine} langue={declinaison.langue} />
      </AbsoluteFill>
    </FournisseurDeMarque>
  );
}
