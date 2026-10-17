import type { DecorDuKaraoke, FondSurMesure } from "../spec";
import type { PropsDuDecor } from "./battement";
import { Horizon } from "./Horizon";
import { Minimal } from "./Minimal";
import { Ocean } from "./Ocean";
import { SurMesure } from "./SurMesure";
import { Ville } from "./Ville";
import { Vinyle } from "./Vinyle";

/** Les décors DESSINÉS. Un `Record` : un décor ajouté à la liste sans son dessin ne compile pas. */
const DECORS: Record<Exclude<DecorDuKaraoke, "sur-mesure">, (props: PropsDuDecor) => React.ReactElement> = {
  horizon: Horizon,
  ville: Ville,
  ocean: Ocean,
  vinyle: Vinyle,
  minimal: Minimal,
};

type PropsDuChoix = PropsDuDecor & { decor: DecorDuKaraoke; fond?: FondSurMesure; version: "long" | "court" };

/** Le décor choisi : dessiné, ou la vidéo sur mesure du format rendu (horizon tant qu'elle manque). */
export function Decor({ decor, fond, version, ...props }: PropsDuChoix) {
  const video = decor === "sur-mesure" ? fond?.videos[version] : undefined;
  if (video) return <SurMesure fichier={video} />;
  const Dessin = DECORS[decor === "sur-mesure" ? "horizon" : decor];
  return <Dessin {...props} />;
}

/** Où les paroles se posent : au centre pour « minimal » (elles sont le décor), en bas sinon. */
export function dispositionDesParoles(decor: DecorDuKaraoke): "bas" | "centre" {
  return decor === "minimal" ? "centre" : "bas";
}
