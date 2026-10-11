"use client";

import { useId } from "react";

type Props = {
  question: string;
  // Ce que dit le modèle : montré en exemple, jamais gardé comme réponse.
  exemple: string;
  valeur: string;
  onChange: (valeur: string) => void;
  max?: number;
  aide?: string;
  // Proposé depuis le site et pas encore retouché : à relire.
  propose?: boolean;
  // Ce que le site propose pour ce texte, montré s'il diffère de la réponse.
  suggestion?: string;
};

/**
 * Une question, en clair, et la case pour y répondre. Tant que la réponse est
 * celle du modèle, la case est vide et le modèle s'affiche en exemple ; une
 * case vidée retrouve l'exemple (la fiche reste valide, et le texte reste
 * signalé « à écrire »).
 */
export default function ChampTexte({ question, exemple, valeur, onChange, max, aide, propose = false, suggestion }: Props) {
  const id = useId();
  const aEcrire = valeur.trim() === exemple.trim();
  const affichee = aEcrire ? "" : valeur;
  const longueur = affichee.trim().length;
  const tropLong = max !== undefined && longueur > max;

  return (
    <div className="champ">
      <div className="champ-tete">
        <label htmlFor={id} className="champ-question">
          {question}
        </label>
        {aEcrire ? <span className="champ-etat">À écrire</span> : propose ? <span className="champ-etat propose">Proposé, à vérifier</span> : null}
      </div>
      {aide && <p className="champ-aide">{aide}</p>}
      <input
        id={id}
        className={`champ-saisie${tropLong ? " trop-long" : ""}`}
        value={affichee}
        placeholder={`Exemple : ${exemple}`}
        aria-invalid={tropLong}
        onChange={(evenement) => onChange(evenement.target.value.trim() === "" ? exemple : evenement.target.value)}
      />
      {suggestion && suggestion.trim() !== valeur.trim() && (
        <div className="suggestion">
          <span>
            Proposé depuis ton site : <q>{suggestion}</q>
          </span>
          <button type="button" className="lien" onClick={() => onChange(suggestion)} aria-label={`Utiliser la proposition pour « ${question} »`}>
            Utiliser
          </button>
        </div>
      )}
      {max !== undefined && (
        <span className={`champ-compteur${tropLong ? " trop-long" : ""}`} aria-live="polite">
          {longueur} / {max}
        </span>
      )}
    </div>
  );
}
