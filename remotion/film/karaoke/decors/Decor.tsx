import type { DecorDuKaraoke } from "../spec";
import type { PropsDuDecor } from "./battement";
import { Horizon } from "./Horizon";
import { Minimal } from "./Minimal";
import { Ocean } from "./Ocean";
import { Ville } from "./Ville";
import { Vinyle } from "./Vinyle";

/** Le décor choisi par l'artiste. Un `Record` : un décor ajouté à la liste sans son dessin ne compile pas. */
const DECORS: Record<DecorDuKaraoke, (props: PropsDuDecor) => React.ReactElement> = {
  horizon: Horizon,
  ville: Ville,
  ocean: Ocean,
  vinyle: Vinyle,
  minimal: Minimal,
};

export function Decor({ decor, ...props }: PropsDuDecor & { decor: DecorDuKaraoke }) {
  const Dessin = DECORS[decor];
  return <Dessin {...props} />;
}

/** Où les paroles se posent : au centre pour « minimal » (elles sont le décor), en bas sinon. */
export function dispositionDesParoles(decor: DecorDuKaraoke): "bas" | "centre" {
  return decor === "minimal" ? "centre" : "bas";
}
