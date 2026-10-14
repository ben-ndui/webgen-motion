"use client";

import { useState } from "react";

import { ajouterUnEpisode, ajouterUneScene } from "@/lib/cinema/edition-serie";
import type { CinemaDuFilm } from "../../../../../../../remotion/film/cinema/types";
import { EPISODES_MAX, SCENES_PAR_EPISODE } from "../../../../../../../remotion/film/cinema/validerCinema";
import SceneDeLaSerie from "./scene-de-la-serie";
import type { SuiviDUnPlan } from "./use-suivi-des-plans";

type Props = {
  filmId: string;
  cinema: CinemaDuFilm;
  suivis: Record<string, SuiviDUnPlan>;
  blocage: string | null;
  modifierLaSerie: (changement: (cinema: CinemaDuFilm) => void) => void;
  onGenerer: (planId: string) => void;
};

/** Les épisodes : on en choisit un, on écrit son titre, puis ses scènes. */
export default function EpisodesDeLaSerie({ filmId, cinema, suivis, blocage, modifierLaSerie, onGenerer }: Props) {
  const [choisi, setChoisi] = useState(cinema.episodes[0]?.id ?? "");
  const episode = cinema.episodes.find((e) => e.id === choisi) ?? cinema.episodes[0];
  if (!episode) return null;

  return (
    <div className="episodes">
      <div className="langues" role="tablist" aria-label="Épisodes">
        {cinema.episodes.map((e) => (
          <button key={e.id} type="button" role="tab" aria-selected={e.id === episode.id} className={e.id === episode.id ? "actif" : ""} onClick={() => setChoisi(e.id)}>
            {e.titre}
          </button>
        ))}
        {cinema.episodes.length < EPISODES_MAX && (
          <button type="button" onClick={() => modifierLaSerie((c) => setChoisi(ajouterUnEpisode(c)))}>
            Nouvel épisode
          </button>
        )}
      </div>

      <label className="champ titre-episode">
        <span className="champ-question">Titre de l&apos;épisode</span>
        <input
          className="champ-saisie"
          value={episode.titre}
          onChange={(e) =>
            modifierLaSerie((c) => {
              const copie = c.episodes.find((ep) => ep.id === episode.id);
              // Un titre vide rendrait la fiche invalide : on garde au moins le numéro.
              if (copie) copie.titre = e.target.value.trim() === "" ? `Épisode ${c.episodes.indexOf(copie) + 1}` : e.target.value;
            })
          }
        />
      </label>

      {episode.scenes.map((scene, index) => (
        <SceneDeLaSerie
          key={scene.id}
          filmId={filmId}
          cinema={cinema}
          scene={scene}
          numero={index + 1}
          suivis={suivis}
          blocage={blocage}
          modifierLaSerie={modifierLaSerie}
          onGenerer={onGenerer}
        />
      ))}
      {episode.scenes.length < SCENES_PAR_EPISODE.max && (
        <button type="button" className="film-btn film-btn-ghost" onClick={() => modifierLaSerie((c) => ajouterUneScene(c, episode.id))}>
          Ajouter une scène
        </button>
      )}
    </div>
  );
}
