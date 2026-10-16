import { AbsoluteFill } from "remotion";

import { BoiteDeReception } from "../composants/BoiteDeReception";
import { ConversationSMS } from "../composants/ConversationSMS";
import { DecorDeDirection } from "../composants/DecorDeDirection";
import { useMarque, useSurface } from "../marque/MarqueDuFilm";
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
  const format = useFormat();
  const { appareil } = useMarque();
  // Produit sur ordinateur : la même histoire, dans une boîte de réception.
  const ordinateur = appareil?.type === "ordinateur";
  return (
    <AbsoluteFill style={{ background: surface.fond, alignItems: "center", justifyContent: "center" }}>
      <DecorDeDirection surface={surface} />
      {ordinateur ? (
        <BoiteDeReception tempo={tempo} messages={textes.messages} heure={textes.heure}
          titre={textes.titreDeLaBoite ?? ""} largeur={format === "paysage" ? 1240 : 980} />
      ) : (
        <div style={{ transform: `scale(${ECHELLE[format]})` }}>
          <ConversationSMS tempo={tempo} messages={textes.messages} heure={textes.heure} largeur={460} />
        </div>
      )}
    </AbsoluteFill>
  );
}
