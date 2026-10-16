import { AbsoluteFill, Sequence } from "remotion";

import { BandeSon } from "../composants/BandeSon";
import { VoixOff, voixPlacees } from "../composants/VoixOff";
import { FournisseurDeMarque } from "../marque/MarqueDuFilm";
import { usePolice } from "../marque/police";
import { IMAGES_PAR_SECONDE, placerLesPlans } from "../lib/tempo";
import { P7Fin } from "../plans/P7Fin";
import type { Repere } from "../reperes";
import type { DeclinaisonDuFilm, Langue } from "../spec";
import { ID_DE_LA_FIN, SCENE, plansDeLExplainer } from "./rythme";
import { Scene } from "./Scene";
import type { ExplainerSpec } from "./spec";

export type ProprietesDeLExplainer = { spec: ExplainerSpec; declinaison: DeclinaisonDuFilm };

const FONDU_FINAL = 60;

/** Les repères de la voix off : une réplique par scène, quand son visuel arrive. */
export function reperesDeLExplainer(spec: ExplainerSpec, langue: Langue): Repere[] {
  return spec.scenes.map((scene) => {
    const textes = spec.textes[langue].scenes[scene.id];
    const mots = textes?.mots;
    const texte = textes?.sousTitre ?? (mots?.type === "phrase" ? mots.phrase : "");
    return { cle: `scenes.${scene.id}`, plan: scene.id, temps: SCENE.voix, texte };
  });
}

/**
 * Un explainer : ses scènes bout à bout, coupées sur le temps fort, puis la
 * fin du film (logo, signature, contact). La musique se baisse sous la voix.
 */
export function Explainer({ spec, declinaison }: ProprietesDeLExplainer) {
  const police = usePolice(spec.marque.police);
  const tempo = spec.musique.tempo;
  const textes = spec.textes[declinaison.langue];
  const places = placerLesPlans(plansDeLExplainer(spec), tempo);
  const voix = voixPlacees(
    spec.voix?.lignes[declinaison.langue] ?? [],
    reperesDeLExplainer(spec, declinaison.langue),
    places,
    tempo,
    IMAGES_PAR_SECONDE,
  );

  return (
    <FournisseurDeMarque marque={spec.marque}>
      <AbsoluteFill style={{ background: spec.marque.couleurs.encre, fontFamily: police }}>
        <BandeSon musique={spec.musique} fondu={FONDU_FINAL} voix={voix} sousLaVoix={spec.voix?.musiqueSousLaVoix} />
        <VoixOff voix={voix} />
        {places.map((plan) => {
          const scene = spec.scenes.find((s) => s.id === plan.id);
          const textesDeScene = textes.scenes[plan.id];
          return (
            <Sequence key={plan.id} from={plan.debut} durationInFrames={plan.duree} name={plan.id}>
              {plan.id === ID_DE_LA_FIN || !scene || !textesDeScene ? (
                <P7Fin tempo={tempo} textes={{ disponible: textes.signature }} avecContact={declinaison.avecContact} />
              ) : (
                <Scene scene={scene} textes={textesDeScene} tempo={tempo} />
              )}
            </Sequence>
          );
        })}
      </AbsoluteFill>
    </FournisseurDeMarque>
  );
}
