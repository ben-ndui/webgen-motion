"use client";

import type { Enregistrement } from "./use-fiche-du-film";

const TEXTES: Record<Exclude<Enregistrement, "erreur">, string> = {
  "a-jour": "Enregistré",
  "en-attente": "Modifications en cours…",
  "en-cours": "Enregistrement…",
};

/** Dit si ce qu'on a tapé est bien parti sur le disque, et permet de réessayer sinon. */
export default function IndicateurDEnregistrement({ etat, onReessayer }: { etat: Enregistrement; onReessayer: () => void }) {
  if (etat === "erreur") {
    return (
      <span className="enregistrement erreur" role="alert">
        Pas enregistré.{" "}
        <button type="button" className="lien" onClick={onReessayer}>
          Réessayer
        </button>
      </span>
    );
  }
  return (
    <span className={`enregistrement ${etat}`} role="status">
      {TEXTES[etat]}
    </span>
  );
}
