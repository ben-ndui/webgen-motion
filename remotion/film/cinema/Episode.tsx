import { AbsoluteFill, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

import { PLogoConstruit } from "../bibliotheque/PLogoConstruit";
import { BandeSon } from "../composants/BandeSon";
import type { ProprietesDuFilm } from "../FilmPrincipal";
import { DIRECTION_PAR_DEFAUT, fondDuFilm } from "../marque/direction";
import { FournisseurDeMarque } from "../marque/MarqueDuFilm";
import { usePolice } from "../marque/police";
import { CalquesDeVerite } from "./CalquesDeVerite";
import { CartonDeFin } from "./CartonDeFin";
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

function EntreeDeLaFin({ children }: { children: React.ReactNode }) {
  const opacite = interpolate(useCurrentFrame(), [0, FONDU_VERS_LE_LOGO], [0, 1], { extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: opacite }}>{children}</AbsoluteFill>;
}

function FinDeLEpisode({ spec, declinaison }: ProprietesDuFilm) {
  const fin = spec.cinema?.fin;
  if (fin?.type === "carton") return <CartonDeFin texte={fin.texte} logo={fin.logo} />;
  const textes = spec.textes[declinaison.langue];
  const signature = textes.bibliotheque?.signature ?? textes.bascule.signature;
  return <PLogoConstruit tempo={spec.musique.tempo} signature={signature} />;
}

/**
 * Un épisode de la série : ses plans générés, montés bout à bout (coupe
 * franche dans une scène, fondu entre deux), la musique du film baissée sous
 * chaque réplique (sauf série sans musique), puis la fin choisie : le vrai
 * logo de la marque, un carton du studio, ou rien.
 * « APERÇU » reste tant qu'un objet est imaginé (CalquesDeVerite.tsx).
 */
export function Episode({ spec, declinaison, episode }: ProprietesDeLEpisode) {
  const police = usePolice(spec.marque.police);
  const { fps } = useVideoConfig();
  if (!spec.cinema) throw new Error("Episode : la fiche n'a pas de série (« cinema »).");
  const montage = monterLEpisode(spec.cinema, episode, spec.musique.tempo, fps);
  const repliques = montage.morceaux.filter((m) => m.replique).map((m) => ({ debut: m.debut, fin: m.debut + m.duree }));

  return (
    <FournisseurDeMarque marque={spec.marque} direction={spec.direction}>
      <AbsoluteFill style={{ background: fondDuFilm(spec.direction ?? DIRECTION_PAR_DEFAUT, spec.marque.couleurs), fontFamily: police }}>
        {spec.cinema.musique !== "aucune" && <BandeSon musique={spec.musique} fondu={FONDU_DE_LA_MUSIQUE} voix={repliques} sousLaVoix={MUSIQUE_SOUS_UNE_REPLIQUE} />}
        {montage.morceaux.map((morceau, index) => (
          <Sequence key={`${morceau.planId}-${index}`} from={morceau.debut} durationInFrames={morceau.duree} name={morceau.planId}>
            <MorceauDePlan morceau={morceau} />
          </Sequence>
        ))}
        {montage.fin !== "aucune" && (
          <Sequence from={montage.debutDeLaFin} name="fin">
            <EntreeDeLaFin>
              <FinDeLEpisode spec={spec} declinaison={declinaison} />
            </EntreeDeLaFin>
          </Sequence>
        )}
        <CalquesDeVerite debutDeLaFin={montage.debutDeLaFin} objetImagine={montage.objetImagine} langue={declinaison.langue} />
      </AbsoluteFill>
    </FournisseurDeMarque>
  );
}
