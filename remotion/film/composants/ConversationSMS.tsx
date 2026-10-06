import type { CSSProperties } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

import { useCouleurs } from "../marque/MarqueDuFilm";
import { entre, progression } from "../lib/mouvement";
import { imageDuTemps } from "../lib/tempo";
import type { MessageDeLaConversation } from "../textes/types";
import { CadreTelephone } from "./CadreTelephone";

type Props = {
  tempo: number;
  messages: [MessageDeLaConversation, ...MessageDeLaConversation[]];
  largeur: number;
  heure: string;
};

const TEMPS_PAR_BULLE = 2;

/**
 * Le problème MONTRÉ plutôt que raconté : un vrai fil de messages façon
 * iMessage, dans le même cadre que les captures (`CadreTelephone`).
 *
 * Les bulles arrivent une à une, deux temps musicaux chacune, dans l'ordre
 * d'une relance qui traîne. Un temps après la dernière, la PREMIÈRE bulle
 * revient, décalée et plus bas, comme un second envoi : c'est la relance
 * restée sans suite. Le geste vient du « deux fois » de VAGUA (un mot qui se
 * dédouble en glissant).
 */
export function ConversationSMS({ tempo, messages, largeur, heure }: Props) {
  const couleurs = useCouleurs();
  const image = useCurrentFrame();
  const temps = (n: number) => imageDuTemps(n, tempo);
  const premiereBulle = messages[0];
  const retourDebut = temps(messages.length * TEMPS_PAR_BULLE + 1);
  const retour = progression(image, retourDebut, temps(1));

  return (
    <CadreTelephone largeur={largeur}>
      <AbsoluteFill style={{ background: couleurs.clair }}>
        <BarreDeStatut heure={heure} />
        <div
          style={{
            position: "absolute",
            left: 22,
            right: 22,
            top: 92,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {messages.map((message, index) => {
            const debut = temps(index * TEMPS_PAR_BULLE);
            const montee = progression(image, debut, temps(1));
            if (montee === 0) return null;
            return (
              <Bulle
                key={index}
                message={message}
                style={{ transform: `translateY(${entre(32, 0, montee)}px)` }}
              />
            );
          })}
          {retour > 0 ? (
            <Bulle
              message={premiereBulle}
              style={{ marginLeft: 28, transform: `translateY(${entre(-14, 10, retour)}px)` }}
            />
          ) : null}
        </div>
      </AbsoluteFill>
    </CadreTelephone>
  );
}

function Bulle({ message, style }: { message: MessageDeLaConversation; style: CSSProperties }) {
  const couleurs = useCouleurs();
  const envoyee = message.auteur === "moi";
  return (
    <div style={{ display: "flex", justifyContent: envoyee ? "flex-end" : "flex-start", ...style }}>
      <div
        style={{
          maxWidth: "76%",
          padding: "13px 17px",
          borderRadius: 19,
          fontWeight: 400,
          fontSize: 17,
          lineHeight: 1.25,
          background: envoyee ? couleurs.accent : couleurs.bulleRecue,
          color: envoyee ? couleurs.clair : couleurs.encre,
        }}
      >
        {message.texte}
      </div>
    </div>
  );
}

/** Barre de statut minimaliste : juste assez pour ancrer « un vrai téléphone ». */
function BarreDeStatut({ heure }: { heure: string }) {
  const couleurs = useCouleurs();
  return (
    <div
      style={{
        position: "absolute",
        left: 24,
        right: 20,
        top: 18,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontWeight: 600,
        fontSize: 15,
        color: couleurs.encre,
      }}
    >
      <span>{heure}</span>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3 }}>
        {[5, 8, 11, 14].map((hauteur) => (
          <div key={hauteur} style={{ width: 3, height: hauteur, borderRadius: 1, background: couleurs.encre }} />
        ))}
        <div
          style={{
            marginLeft: 6,
            width: 22,
            height: 11,
            border: `1.5px solid ${couleurs.encre}`,
            borderRadius: 3,
            padding: 1.5,
          }}
        >
          <div style={{ width: "70%", height: "100%", borderRadius: 1, background: couleurs.encre }} />
        </div>
      </div>
    </div>
  );
}
