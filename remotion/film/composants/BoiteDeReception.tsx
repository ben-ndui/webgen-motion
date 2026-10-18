import { AbsoluteFill, useCurrentFrame } from "remotion";

import { useCouleurs } from "../marque/MarqueDuFilm";
import { entre, progression } from "../lib/mouvement";
import { imageDuTemps } from "../lib/tempo";
import { TEMPS_PAR_BULLE } from "../reperes";
import type { MessageDeLaConversation } from "../textes/types";
import { CadreOrdinateur } from "./CadreOrdinateur";

const HAUTEUR_DU_TITRE = 120;
const HAUTEUR_DE_LIGNE = 68;
const MARGE_BASSE = 40;

type Props = {
  tempo: number;
  messages: [MessageDeLaConversation, ...MessageDeLaConversation[]];
  largeur: number;
  // Date affichée en face de chaque ligne (« 6 oct. »).
  heure: string;
  titre: string;
};

/**
 * Le pendant de `ConversationSMS` pour un produit sur ordinateur : une boîte
 * de réception. Mêmes temps : une ligne tous les deux temps, et un temps après
 * la dernière, la PREMIÈRE revient en tête, en gras, comme un second envoi :
 * la relance restée sans réponse.
 */
export function BoiteDeReception({ tempo, messages, largeur, heure, titre }: Props) {
  const couleurs = useCouleurs();
  // La boîte n'est pas une capture : sa fenêtre se règle sur ses lignes (titre
  // + messages + la relance qui revient), pas sur le rapport des captures,
  // sinon cinq lignes flottent dans une fenêtre aux trois quarts vide.
  const rapport = (HAUTEUR_DU_TITRE + (messages.length + 1) * HAUTEUR_DE_LIGNE + MARGE_BASSE) / largeur;
  const image = useCurrentFrame();
  const temps = (n: number) => imageDuTemps(n, tempo);
  const retour = progression(image, temps(messages.length * TEMPS_PAR_BULLE + 1), temps(1));

  return (
    <CadreOrdinateur largeur={largeur} rapport={rapport}>
      <AbsoluteFill style={{ background: couleurs.clair, padding: "28px 0" }}>
        <div style={{ padding: "0 36px 18px", fontSize: 34, fontWeight: 600, color: couleurs.encre }}>{titre}</div>
        {retour > 0 ? <Ligne message={messages[0]} heure={heure} gras decalage={entre(-20, 0, retour)} /> : null}
        {messages
          .map((message, index) => ({ message, montee: progression(image, temps(index * TEMPS_PAR_BULLE), temps(1)) }))
          .filter(({ montee }) => montee > 0)
          .reverse()   // le plus récent en haut, comme une vraie boîte
          .map(({ message, montee }, index) => (
            <Ligne key={index} message={message} heure={heure} decalage={entre(-20, 0, montee)} />
          ))}
      </AbsoluteFill>
    </CadreOrdinateur>
  );
}

function Ligne({ message, heure, gras = false, decalage }: {
  message: MessageDeLaConversation; heure: string; gras?: boolean; decalage: number;
}) {
  const couleurs = useCouleurs();
  const envoye = message.auteur === "moi";
  // Toujours écrit dans la fiche (validerSpec l'exige pour un ordinateur).
  const expediteur = message.expediteur ?? "";
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "230px 1fr auto",
        gap: 20,
        alignItems: "center",
        padding: "20px 36px",
        borderTop: `1px solid ${couleurs.encre}14`,
        transform: `translateY(${decalage}px)`,
        fontSize: 23,
        color: couleurs.encre,
        fontWeight: gras ? 600 : 400,
        background: gras ? `${couleurs.accent}10` : "transparent",
      }}
    >
      <span style={{ color: envoye ? couleurs.accent : couleurs.encre, fontWeight: 600 }}>{expediteur}</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{message.texte}</span>
      <span style={{ opacity: 0.6, fontSize: 19 }}>{heure}</span>
    </div>
  );
}
