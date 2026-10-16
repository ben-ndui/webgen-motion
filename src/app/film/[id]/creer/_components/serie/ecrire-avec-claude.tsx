"use client";

import { useState } from "react";

import type { CinemaDuFilm } from "../../../../../../../remotion/film/cinema/types";
import MessageAvecReglage from "./message-avec-reglage";

type Props = {
  filmId: string;
  // La série a-t-elle déjà des épisodes ? Change seulement le libellé.
  premierEpisode: boolean;
  // Enregistre d'abord : la série proposée part de la fiche du DISQUE, elle ne doit pas effacer ce qu'on vient de taper.
  avantDEcrire: () => Promise<boolean>;
  quandEcrit: (cinema: CinemaDuFilm, episodeId: string) => void;
};

type Etat = { etat: "repos" } | { etat: "en-cours" } | { etat: "erreur"; raison: string };

/**
 * Le brief de la cliente → un épisode écrit par Claude (personnages, scènes,
 * plans, répliques), ajouté à la série. Rien n'est généré chez Google : on
 * relit, on retouche, puis on génère plan par plan.
 */
export default function EcrireAvecClaude({ filmId, premierEpisode, avantDEcrire, quandEcrit }: Props) {
  const [brief, setBrief] = useState("");
  const [etat, setEtat] = useState<Etat>({ etat: "repos" });
  const enCours = etat.etat === "en-cours";

  const ecrire = async () => {
    setEtat({ etat: "en-cours" });
    if (!(await avantDEcrire())) {
      setEtat({ etat: "erreur", raison: "Enregistrement impossible : rien n'a été demandé à Claude." });
      return;
    }
    try {
      const reponse = await fetch(`/api/motion/film/${filmId}/cinema/scenario`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief }),
      });
      const corps = (await reponse.json().catch(() => ({}))) as { cinema?: CinemaDuFilm; episodeId?: string; erreur?: string };
      if (!reponse.ok || !corps.cinema || !corps.episodeId) {
        setEtat({ etat: "erreur", raison: corps.erreur ?? "Claude n'a pas pu écrire l'épisode." });
        return;
      }
      quandEcrit(corps.cinema, corps.episodeId);
      setBrief("");
      setEtat({ etat: "repos" });
    } catch {
      setEtat({ etat: "erreur", raison: "GEN MOTION ne répond pas." });
    }
  };

  return (
    <section className="bloc ecrire-avec-claude" aria-label="Écrire un épisode avec Claude">
      <h3 className="bloc-titre">{premierEpisode ? "Écrire le premier épisode avec Claude" : "Écrire l'épisode suivant avec Claude"}</h3>
      <label className="champ">
        <span className="champ-question">Ce que veut la cliente</span>
        <span className="champ-aide">
          L&apos;histoire, le ton, qui parle. Claude propose les personnages, les scènes, les plans et les répliques ; les personnages déjà là
          reviennent avec leur visage. Tu relis tout avant de générer quoi que ce soit.
        </span>
        <textarea
          className="champ-saisie zone"
          rows={4}
          maxLength={2000}
          value={brief}
          disabled={enCours}
          placeholder="Une cliente entre dans la boutique un soir de pluie et reconnaît le parfum de sa grand-mère."
          onChange={(e) => setBrief(e.target.value)}
        />
      </label>
      <button type="button" className="film-btn" disabled={enCours || brief.trim().length < 10} onClick={() => void ecrire()}>
        {enCours ? "Claude écrit l'épisode…" : "Écrire l'épisode (quelques centimes)"}
      </button>
      {etat.etat === "erreur" && (
        <p className="depot-erreur" role="alert">
          <MessageAvecReglage message={etat.raison} />
        </p>
      )}
    </section>
  );
}
