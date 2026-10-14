"use client";

import { useId } from "react";

type Props = {
  question: string;
  // Le texte d'exemple : montré grisé, jamais gardé comme réponse.
  exemple: string;
  valeur: string;
  onChange: (valeur: string) => void;
  aide?: string;
  max?: number;
};

/**
 * Comme ChampTexte, en plusieurs lignes : tant que la réponse est l'exemple,
 * la case est vide, l'exemple s'affiche en gris et le champ est signalé
 * « À écrire ». Une case vidée retrouve l'exemple (la fiche reste valide ;
 * le serveur refuse de générer sur un exemple).
 */
export default function ZoneTexte({ question, exemple, valeur, onChange, aide, max }: Props) {
  const id = useId();
  const aEcrire = valeur.trim() === exemple.trim();
  const affichee = aEcrire ? "" : valeur;
  const tropLong = max !== undefined && affichee.trim().length > max;

  return (
    <div className="champ">
      <div className="champ-tete">
        <label htmlFor={id} className="champ-question">
          {question}
        </label>
        {aEcrire && <span className="champ-etat">À écrire</span>}
      </div>
      {aide && <p className="champ-aide">{aide}</p>}
      <textarea
        id={id}
        className={`champ-saisie zone${tropLong ? " trop-long" : ""}`}
        value={affichee}
        placeholder={`Exemple : ${exemple}`}
        aria-invalid={tropLong}
        rows={3}
        onChange={(evenement) => onChange(evenement.target.value.trim() === "" ? exemple : evenement.target.value)}
      />
      {max !== undefined && (
        <span className={`champ-compteur${tropLong ? " trop-long" : ""}`} aria-live="polite">
          {affichee.trim().length} / {max}
        </span>
      )}
    </div>
  );
}
