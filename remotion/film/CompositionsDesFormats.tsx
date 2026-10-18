import { type CalculateMetadataFunction, Composition, staticFile } from "remotion";

import { CADRES } from "./CompositionFilm";
import { Conte, type ProprietesDuConte } from "./conte/Conte";
import { CONTE } from "./conte/ficheConte";
import { plansDuConte } from "./conte/trame";
import { validerConte } from "./conte/validerConte";
import { Explainer, type ProprietesDeLExplainer } from "./explainer/Explainer";
import { EXPLAINER } from "./explainer/ficheExplainer";
import { plansDeLExplainer, scenesTropCourtes } from "./explainer/rythme";
import { validerExplainer } from "./explainer/validerExplainer";
import { KARAOKE } from "./karaoke/ficheKaraoke";
import { Karaoke, type ProprietesDuKaraoke, SECONDES_DE_FIN } from "./karaoke/Karaoke";
import { dureeDuPassage, passageDe } from "./karaoke/lecture";
import type { ParolesDuKaraoke } from "./karaoke/spec";
import { erreursDesParoles, validerKaraoke } from "./karaoke/validerKaraoke";
import { IMAGES_PAR_SECONDE, dureeTotale } from "./lib/tempo";

// Les formats du catalogue (explainer, conte, karaoké), repris du gabarit
// film-motion du brain. Même contrat que `Film` : inputProps = { spec,
// declinaison } (scripts/render-format.ts). Les fiches d'exemple ne servent
// qu'au Studio Remotion.

export const metadonneesDeLExplainer: CalculateMetadataFunction<ProprietesDeLExplainer> = ({ props }) => {
  const spec = validerExplainer(props.spec);
  const tropCourtes = scenesTropCourtes(spec, props.declinaison.langue);
  if (tropCourtes.length > 0) throw new Error(`Scènes trop courtes (ajouter des mesures) : ${tropCourtes.join(", ")}`);
  return { ...CADRES[props.declinaison.version], durationInFrames: dureeTotale(plansDeLExplainer(spec), spec.musique.tempo) };
};

export const metadonneesDuConte: CalculateMetadataFunction<ProprietesDuConte> = ({ props }) => {
  const spec = validerConte(props.spec);
  return { ...CADRES[props.declinaison.version], durationInFrames: dureeTotale(plansDuConte(spec, props.declinaison.langue), spec.musique.tempo) };
};

// Le karaoké lit ses paroles calées dans le dossier public du projet et les passe en props.
export const metadonneesDuKaraoke: CalculateMetadataFunction<ProprietesDuKaraoke> = async ({ props }) => {
  const spec = validerKaraoke(props.spec);
  const reponse = await fetch(staticFile(spec.paroles));
  if (!reponse.ok) throw new Error(`Paroles absentes : ${spec.paroles}`);
  const paroles = (await reponse.json()) as ParolesDuKaraoke;
  const erreurs = erreursDesParoles(paroles, spec, false);
  if (erreurs.length > 0) throw new Error(erreurs.join("\n"));
  const passage = passageDe(spec.morceau, props.declinaison.version);
  const secondes = dureeDuPassage(paroles.lignes, passage.debut, passage.fin) + SECONDES_DE_FIN;
  return { ...CADRES[props.declinaison.version], durationInFrames: Math.round(secondes * IMAGES_PAR_SECONDE), props: { ...props, paroles } };
};

/** Les compositions `Explainer`, `Conte` et `Karaoke` (render-format.ts --format). */
export function CompositionsDesFormats() {
  const premiers = { explainer: EXPLAINER.declinaisons[0], conte: CONTE.declinaisons[0], karaoke: KARAOKE.declinaisons[0] };
  if (!premiers.explainer || !premiers.conte || !premiers.karaoke) return null;
  return (
    <>
      <Composition id="Explainer" component={Explainer} {...CADRES[premiers.explainer.version]} fps={IMAGES_PAR_SECONDE}
        durationInFrames={1} defaultProps={{ spec: EXPLAINER, declinaison: premiers.explainer }} calculateMetadata={metadonneesDeLExplainer} />
      <Composition id="Conte" component={Conte} {...CADRES[premiers.conte.version]} fps={IMAGES_PAR_SECONDE}
        durationInFrames={1} defaultProps={{ spec: CONTE, declinaison: premiers.conte }} calculateMetadata={metadonneesDuConte} />
      <Composition id="Karaoke" component={Karaoke} {...CADRES[premiers.karaoke.version]} fps={IMAGES_PAR_SECONDE}
        durationInFrames={1} defaultProps={{ spec: KARAOKE, declinaison: premiers.karaoke }} calculateMetadata={metadonneesDuKaraoke} />
    </>
  );
}
