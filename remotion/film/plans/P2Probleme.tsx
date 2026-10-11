import { AbsoluteFill } from "remotion";

import { ConversationSMS } from "../composants/ConversationSMS";
import { DecorDeDirection } from "../composants/DecorDeDirection";
import { useSurface } from "../marque/MarqueDuFilm";
import { useFormat } from "../lib/format";
import type { TextesDuFilm } from "../textes/types";

type Props = { tempo: number; textes: TextesDuFilm["probleme"] };

// La conversation est dessinée à l'échelle d'un vrai téléphone (bulles en
// 17 px) : en 9:16 on l'agrandit d'un bloc, plutôt que de tout recalculer.
const ECHELLE = { paysage: 1, portrait: 1.4 } as const;

/**
 * Plan 2, le problème : MONTRÉ par une vraie conversation, pas raconté par
 * une phrase. La relance revient à la fin (voir `ConversationSMS`).
 */
export function P2Probleme({ tempo, textes }: Props) {
  const surface = useSurface("sombre");
  const echelle = ECHELLE[useFormat()];
  return (
    <AbsoluteFill style={{ background: surface.fond, alignItems: "center", justifyContent: "center" }}>
      <DecorDeDirection surface={surface} />
      <div style={{ transform: `scale(${echelle})` }}>
        <ConversationSMS tempo={tempo} messages={textes.messages} heure={textes.heure} largeur={460} />
      </div>
    </AbsoluteFill>
  );
}
