"use client";

import type { DemandeALAssistant } from "@/lib/cinema/assistant/types";
import type { CinemaDuFilm } from "../../../../../../../remotion/film/cinema/types";
import PropositionDeClaude from "./proposition-de-claude";
import type { EtatDeLAssistant } from "./use-assistant";
import MessageAvecReglage from "./message-avec-reglage";

export type GesteDeClaude = { libelle: string; demande: DemandeALAssistant };

type Props = {
  cinema: CinemaDuFilm;
  gestes: GesteDeClaude[];
  etat: EtatDeLAssistant;
  demander: (demande: DemandeALAssistant) => void;
  garder: () => void;
  refuser: () => void;
  autre: () => void;
  // Le rappel « Claude propose, tu décides » : une fois par écran suffit.
  avecRappel?: boolean;
};

/**
 * Les gestes où Claude peut aider à cet endroit (un plan, une scène, la
 * série), et sa proposition à garder ou non. Rien n'est remplacé sans clic.
 */
export default function AideDeClaude({ cinema, gestes, etat, demander, garder, refuser, autre, avecRappel = false }: Props) {
  if (gestes.length === 0) return null;
  const enCours = etat.type === "en-cours";

  return (
    <div className="aide-claude">
      <div className="aide-claude-gestes">
        {gestes.map((geste) => (
          <button key={geste.libelle} type="button" className="film-btn film-btn-ghost" disabled={enCours} onClick={() => demander(geste.demande)}>
            {geste.libelle}
          </button>
        ))}
      </div>
      {enCours && (
        <p className="champ-aide" role="status">
          Claude écrit…
        </p>
      )}
      {etat.type === "repos" && avecRappel && <p className="champ-aide">Claude propose, tu décides. Quelques centimes, sur ta clé.</p>}
      {etat.type === "erreur" && (
        <p className="depot-erreur" role="alert">
          <MessageAvecReglage message={etat.raison} />
        </p>
      )}
      {etat.type === "proposition" && (
        <div className="aide-claude-proposition" role="region" aria-label="Proposition de Claude">
          <PropositionDeClaude cinema={cinema} proposition={etat.proposition} />
          <div className="aide-claude-gestes">
            <button type="button" className="film-btn" onClick={garder}>
              Garder
            </button>
            <button type="button" className="film-btn film-btn-ghost" onClick={autre}>
              Autre proposition
            </button>
            <button type="button" className="lien" onClick={refuser}>
              Non merci
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
