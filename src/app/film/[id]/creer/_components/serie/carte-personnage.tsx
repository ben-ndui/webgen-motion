"use client";

/* eslint-disable @next/next/no-img-element -- portrait local servi par l'API du film, déjà à sa taille */

import { COUT_D_UN_PORTRAIT_USD, enDollars } from "@/lib/cinema/couts";
import { EXEMPLES_DE_SERIE, estUnExemple } from "../../../../../../../remotion/film/cinema/exemples";
import type { Personnage } from "../../../../../../../remotion/film/cinema/types";
import type { EtatDuPortrait } from "./use-portraits";
import ZoneTexte from "./zone-texte";

type Props = {
  filmId: string;
  personnage: Personnage;
  version: number;
  etat: EtatDuPortrait;
  // Nombre de plans où il apparaît déjà générés : regénérer son portrait ne les change pas.
  plansDejaGeneres: number;
  modifier: (changement: (personnage: Personnage) => void) => void;
  onGenererLePortrait: () => void;
  onRetirer: () => void;
};

/**
 * Un personnage du casting : son nom, sa description (répétée mot pour mot
 * dans chaque plan) et son portrait de référence, qui garde son visage d'un
 * plan à l'autre.
 */
export default function CartePersonnage({ filmId, personnage, version, etat, plansDejaGeneres, modifier, onGenererLePortrait, onRetirer }: Props) {
  const enCours = etat.etat === "en-cours";
  const descriptionAEcrire = estUnExemple("description", personnage.description);
  const apercu = personnage.portrait ? `/api/motion/film/${filmId}/media?relatif=${encodeURIComponent(personnage.portrait)}&v=${version}` : null;

  return (
    <article className="personnage" aria-label={`Personnage ${personnage.nom}`}>
      <div className={`personnage-portrait${enCours ? " en-cours" : ""}`}>
        {apercu ? (
          <img src={apercu} alt={`Portrait de ${personnage.nom}`} />
        ) : (
          <span className="personnage-sans-portrait">{enCours ? "Portrait en cours…" : "Pas encore de portrait"}</span>
        )}
      </div>
      <div className="personnage-champs">
        <label className="champ">
          <span className="champ-question">Son prénom</span>
          <input className="champ-saisie" value={personnage.nom} onChange={(e) => modifier((p) => void (p.nom = e.target.value.trim() === "" ? "Personnage" : e.target.value))} />
        </label>
        <ZoneTexte
          question="À quoi ressemble-t-il ?"
          aide="Physique et tenue, en une phrase, en anglais (Veo suit mieux l'anglais)."
          exemple={EXEMPLES_DE_SERIE.description}
          valeur={personnage.description}
          max={800}
          onChange={(valeur) => modifier((p) => void (p.description = valeur))}
        />
        <div className="personnage-actions">
          <button type="button" className="film-btn" disabled={enCours || descriptionAEcrire} onClick={onGenererLePortrait}>
            {personnage.portrait ? "Refaire son portrait" : "Générer son portrait"} ({enDollars(COUT_D_UN_PORTRAIT_USD)})
          </button>
          <button type="button" className="lien" onClick={onRetirer}>
            Retirer ce personnage
          </button>
        </div>
        {descriptionAEcrire && <p className="champ-aide">Décris-le d&apos;abord : le portrait se fait à partir de sa description.</p>}
        {personnage.portrait && plansDejaGeneres > 0 && (
          <p className="champ-aide">
            Il apparaît dans {plansDejaGeneres} plan{plansDejaGeneres > 1 ? "s" : ""} déjà généré{plansDejaGeneres > 1 ? "s" : ""} : un nouveau portrait ne
            les change pas, son visage y restera l&apos;ancien.
          </p>
        )}
        {etat.etat === "erreur" && (
          <p className="depot-erreur" role="alert">
            {etat.raison}
          </p>
        )}
      </div>
    </article>
  );
}
