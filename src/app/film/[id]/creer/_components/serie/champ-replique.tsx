"use client";

import { useState } from "react";

import type { Personnage, PlanDeCinema, RepliqueDuPlan } from "../../../../../../../remotion/film/cinema/types";

type Props = {
  presents: Personnage[];
  replique: RepliqueDuPlan | undefined;
  modifierLePlan: (changement: (plan: PlanDeCinema) => void) => void;
};

/**
 * La réplique d'un plan : qui parle, et ce qu'il dit. Elle n'existe dans la
 * fiche que quand son texte n'est pas vide : une réplique vide rendrait la
 * fiche invalide pendant qu'on tape. Seul un personnage À L'IMAGE peut parler.
 */
export default function ChampReplique({ presents, replique, modifierLePlan }: Props) {
  const [choisi, setChoisi] = useState(replique?.personnage ?? presents[0]?.id ?? "");
  // Le personnage choisi a pu sortir du plan : on retombe sur le premier présent.
  const orateur = presents.some((p) => p.id === choisi) ? choisi : (presents[0]?.id ?? "");

  const changerDOrateur = (personnage: string) => {
    setChoisi(personnage);
    if (replique) modifierLePlan((p) => void (p.replique = { personnage, texte: replique.texte }));
  };
  const changerDeTexte = (texte: string) =>
    modifierLePlan((p) => {
      if (texte.trim() === "") delete p.replique;
      else p.replique = { personnage: orateur, texte };
    });

  return (
    <div className="champ">
      <span className="champ-question">Une réplique, en français (facultatif)</span>
      <p className="champ-aide">Dite à l&apos;image, lèvres synchronisées. Huit secondes : une phrase courte.</p>
      <div className="replique">
        {presents.length > 1 && (
          <select className="champ-saisie petit" aria-label="Qui parle" value={orateur} onChange={(e) => changerDOrateur(e.target.value)}>
            {presents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom}
              </option>
            ))}
          </select>
        )}
        <input
          className="champ-saisie"
          aria-label={`Ce que dit ${presents.find((p) => p.id === orateur)?.nom ?? "le personnage"}`}
          maxLength={120}
          placeholder="Laisse vide si personne ne parle"
          value={replique?.texte ?? ""}
          onChange={(e) => changerDeTexte(e.target.value)}
        />
      </div>
    </div>
  );
}
