"use client";

import type { Proposition } from "@/lib/cinema/assistant/types";
import { referencesDeLaSerie } from "@/lib/cinema/bible/etat";
import type { CinemaDuFilm, RepliqueDuPlan } from "../../../../../../../remotion/film/cinema/types";

type Props = { cinema: CinemaDuFilm; proposition: Proposition };

function nom(cinema: CinemaDuFilm, id: string): string {
  return cinema.personnages.find((p) => p.id === id)?.nom ?? id;
}

function nomDeLaReference(cinema: CinemaDuFilm, id: string): string {
  return referencesDeLaSerie(cinema).find((r) => r.id === id)?.nom ?? id;
}

function Replique({ cinema, replique }: { cinema: CinemaDuFilm; replique: RepliqueDuPlan }) {
  return (
    <>
      <b>{nom(cinema, replique.personnage)}</b> : « {replique.texte} »
    </>
  );
}

/** Ce que Claude propose, écrit pour être relu avant d'être gardé. */
export default function PropositionDeClaude({ cinema, proposition }: Props) {
  switch (proposition.type) {
    case "replique":
      return (
        <p>
          <Replique cinema={cinema} replique={proposition.replique} />
        </p>
      );
    case "consigne":
      return <p lang="en">{proposition.consigne}</p>;
    case "dialogues": {
      const plans = cinema.episodes.flatMap((e) => e.scenes).find((s) => s.id === proposition.scene)?.plans ?? [];
      return (
        <ol>
          {plans.map((plan) => {
            const replique = proposition.repliques[plan.id];
            return <li key={plan.id}>{replique ? <Replique cinema={cinema} replique={replique} /> : <span className="champ-aide">Pas de réplique</span>}</li>;
          })}
        </ol>
      );
    }
    case "plan-suivant": {
      const { plan } = proposition;
      const presents = plan.personnages.map((id) => nom(cinema, id));
      return (
        <>
          <p lang="en">{plan.consigne}</p>
          <p className="champ-aide">
            À l&apos;image : {presents.length > 0 ? presents.join(", ") : "personne"}
            {plan.objet ? ", et l'objet du film" : ""}
          </p>
          {plan.replique && (
            <p>
              <Replique cinema={cinema} replique={plan.replique} />
            </p>
          )}
        </>
      );
    }
    case "episode-suivant": {
      const { episode, nouveauxPersonnages } = proposition;
      const plans = episode.scenes.reduce((total, s) => total + s.plans.length, 0);
      return (
        <>
          <p>
            <b>{episode.titre}</b> : {episode.scenes.length} scène{episode.scenes.length > 1 ? "s" : ""}, {plans} plan{plans > 1 ? "s" : ""}.
          </p>
          <ol>
            {episode.scenes.map((scene) => (
              <li key={scene.id} lang="en">
                {scene.decor}
              </li>
            ))}
          </ol>
          {nouveauxPersonnages.length > 0 && <p className="champ-aide">Nouveaux personnages : {nouveauxPersonnages.map((p) => p.nom).join(", ")} (portrait à générer).</p>}
        </>
      );
    }
    case "decrire-reference":
      return (
        <p lang="en">
          <b>{nomDeLaReference(cinema, proposition.reference)}</b> : {proposition.description}
        </p>
      );
  }
}
