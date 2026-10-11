"use client";

import { FILM } from "../../../../../../remotion/film/film";
import type { Langue, TextesDuFilm } from "../../../../../../remotion/film/spec";
import type { MessageDeLaConversation } from "../../../../../../remotion/film/textes/types";
import ChampTexte from "./champ-texte";

const MAXIMUM = 4;

type Props = {
  langue: Langue;
  messages: TextesDuFilm["probleme"]["messages"];
  modifier: (changement: (textes: TextesDuFilm) => void) => void;
  propose: (champ: string, valeur: string) => boolean;
  suggestion: (champ: string) => string | undefined;
};

/**
 * Les bulles de la conversation d'ouverture. Le PREMIER message revient à la
 * fin du plan (c'est la relance restée sans suite) : on le dit.
 */
export default function Conversation({ langue, messages, modifier, propose, suggestion }: Props) {
  const modele = FILM.textes[langue].probleme.messages;
  const exemple = (i: number) => modele[i]?.texte ?? (langue === "fr" ? "Un message" : "A message");

  function auteur(i: number, valeur: MessageDeLaConversation["auteur"]) {
    modifier((t) => { t.probleme.messages[i]!.auteur = valeur; });
  }

  return (
    <div className="conversation">
      {messages.map((message, i) => (
        <div key={i} className={`bulle bulle-${message.auteur}`}>
          <div className="bulle-tete">
            <select className="champ-saisie petit" value={message.auteur} onChange={(e) => auteur(i, e.target.value as MessageDeLaConversation["auteur"])} aria-label={`Qui envoie le message ${i + 1}`}>
              <option value="moi">Toi (à droite)</option>
              <option value="autre">L&apos;autre (à gauche)</option>
            </select>
            {messages.length > 1 && (
              <button type="button" className="lien" onClick={() => modifier((t) => { t.probleme.messages.splice(i, 1); })}>
                Retirer
              </button>
            )}
          </div>
          <ChampTexte
            question={i === 0 ? "Message 1 (il revient à la fin, comme une relance)" : `Message ${i + 1}`}
            exemple={exemple(i)}
            valeur={message.texte}
            propose={propose(`probleme.messages.${i}`, message.texte)} suggestion={suggestion(`probleme.messages.${i}`)}
            max={40}
            onChange={(v) => modifier((t) => { t.probleme.messages[i]!.texte = v; })}
          />
        </div>
      ))}
      {messages.length < MAXIMUM && (
        <button
          type="button"
          className="lien"
          onClick={() => modifier((t) => { t.probleme.messages.push({ auteur: "autre", texte: exemple(t.probleme.messages.length) }); })}
        >
          + Ajouter un message
        </button>
      )}
    </div>
  );
}
