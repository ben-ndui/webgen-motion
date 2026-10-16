"use client";

import { useState } from "react";

import type { SectionDeLHistoire } from "@/lib/histoire/sections";
import type { FilmSpec, Langue } from "../../../../../../../remotion/film/spec";
import MessageAvecReglage from "../serie/message-avec-reglage";
import { poserUneSuggestion } from "../suggestions-du-site";
import { useReecriture } from "./use-reecriture";

type Props = {
  id: string;
  langue: Langue;
  section: SectionDeLHistoire;
  avantDeDemander: () => Promise<boolean>;
  modifier: (changement: (copie: FilmSpec) => void) => void;
};

/** Le nom d'un champ tel que la personne le voit dans la section. */
function libelle(cle: string): string {
  const [plan, sous, rang] = cle.split(".");
  if (plan === "probleme") return `Message ${Number(rang) + 1}`;
  if (plan === "parcours") return `Étape ${Number(sous) + 1}`;
  if (plan === "marque") return `Mot ${Number(rang) + 1}`;
  const noms: Record<string, string> = {
    "bascule.constat": "Aujourd'hui", "bascule.chiffre": "Le chiffre", "bascule.signature": "Ta promesse",
    "evenement.chute": "Ce que ça change", "fin.disponible": "Où trouver ton produit",
  };
  return noms[cle] ?? cle;
}

/**
 * « Écrire avec Claude » au pied d'une section : une consigne facultative
 * (« plus court », « parle des délais »), la proposition champ par champ,
 * et rien ne change sans « Garder ».
 */
export default function EcrireLaSectionAvecClaude({ id, langue, section, avantDeDemander, modifier }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const [consigne, setConsigne] = useState("");
  const { etat, demander, autre, oublier } = useReecriture({ id, langue, section, avantDeDemander });
  const enCours = etat.type === "en-cours";

  const garder = () => {
    if (etat.type !== "proposition") return;
    modifier((copie) => {
      for (const [cle, texte] of Object.entries(etat.champs)) poserUneSuggestion(copie, langue, cle, texte);
    });
    oublier();
    setOuvert(false);
    setConsigne("");
  };

  if (!ouvert) {
    return (
      <div className="aide-claude">
        <div className="aide-claude-gestes">
          <button type="button" className="film-btn film-btn-ghost" onClick={() => setOuvert(true)}>
            Écrire avec Claude
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="aide-claude ecrire-section" data-wm-id={`film.histoire.${section}.claude`}>
      <form className="aide-claude-gestes" onSubmit={(e) => { e.preventDefault(); demander(consigne); }}>
        <label className="sr-only" htmlFor={`consigne-${section}`}>Ce que tu veux de Claude pour cette section</label>
        <input
          id={`consigne-${section}`}
          className="champ-saisie ecrire-section-consigne"
          value={consigne}
          onChange={(e) => setConsigne(e.target.value)}
          placeholder="Facultatif : plus court, plus chaleureux, parle des délais…"
          maxLength={300}
          disabled={enCours}
        />
        <button type="submit" className="film-btn" disabled={enCours}>Proposer</button>
        <button type="button" className="film-btn film-btn-ghost" onClick={() => { oublier(); setOuvert(false); }} disabled={enCours}>Fermer</button>
      </form>
      {etat.type === "repos" && <p className="champ-aide">Claude propose, tu décides. Quelques centimes, sur ta clé.</p>}
      {enCours && <p className="champ-aide" role="status">Claude écrit…</p>}
      {etat.type === "erreur" && (
        <p className="depot-erreur" role="alert">
          <MessageAvecReglage message={etat.raison} />
        </p>
      )}
      {etat.type === "proposition" && (
        <div className="aide-claude-proposition" role="region" aria-label="Proposition de Claude">
          <dl className="ecrire-section-champs">
            {Object.entries(etat.champs).map(([cle, texte]) => (
              <div key={cle}>
                <dt>{libelle(cle)}</dt>
                <dd>{texte}</dd>
              </div>
            ))}
          </dl>
          {etat.aEcrireSoiMeme.length > 0 && (
            <p className="champ-aide">
              Rien de proposé pour : {etat.aEcrireSoiMeme.map(libelle).join(", ")}
              {etat.aEcrireSoiMeme.includes("bascule.chiffre") ? " (aucun chiffre vérifiable sur ton site)" : ""}. Ton texte actuel reste.
            </p>
          )}
          <div className="aide-claude-gestes">
            <button type="button" className="film-btn" onClick={garder}>Garder</button>
            <button type="button" className="film-btn film-btn-ghost" onClick={autre}>Une autre</button>
            <button type="button" className="film-btn film-btn-ghost" onClick={oublier}>Laisser</button>
          </div>
        </div>
      )}
    </div>
  );
}
