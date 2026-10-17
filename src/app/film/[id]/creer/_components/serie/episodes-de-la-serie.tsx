"use client";

import { useState } from "react";

import { ajouterUnEpisode, ajouterUneScene } from "@/lib/cinema/edition-serie";
import type { CinemaDuFilm } from "../../../../../../../remotion/film/cinema/types";
import type { DeclinaisonDuFilm } from "../../../../../../../remotion/film/spec";
import AideDeClaude from "./aide-de-claude";
import RenduDeLEpisode from "./rendu-de-l-episode";
import { EPISODES_MAX, SCENES_PAR_EPISODE } from "../../../../../../../remotion/film/cinema/validerCinema";
import SceneDeLaSerie from "./scene-de-la-serie";
import { useAssistant } from "./use-assistant";
import type { ReferenceAffichee } from "./use-bible";
import type { SuiviDUnPlan } from "./use-suivi-des-plans";

type Props = {
  filmId: string;
  cinema: CinemaDuFilm;
  suivis: Record<string, SuiviDUnPlan>;
  versionsDesPlans: Record<string, number>;
  blocage: string | null;
  // La bible visuelle : null tant qu'elle n'a pas fini de se charger.
  references: ReferenceAffichee[] | null;
  modifierLaSerie: (changement: (cinema: CinemaDuFilm) => void) => void;
  onGenerer: (planId: string) => void;
  declinaisons: DeclinaisonDuFilm[];
  enregistrer: () => Promise<boolean>;
  // L'épisode ouvert au départ (celui que Claude vient d'écrire), sinon le premier.
  episodeOuvert: string | null;
};

/** Les épisodes : on en choisit un, on écrit son titre, puis ses scènes. */
export default function EpisodesDeLaSerie({ filmId, cinema, suivis, versionsDesPlans, blocage, references, modifierLaSerie, onGenerer, declinaisons, enregistrer, episodeOuvert }: Props) {
  const [choisi, setChoisi] = useState(episodeOuvert ?? cinema.episodes[0]?.id ?? "");
  const episode = cinema.episodes.find((e) => e.id === choisi) ?? cinema.episodes[0];
  const assistant = useAssistant(filmId, cinema, modifierLaSerie);
  if (!episode) return null;
  const gestes = cinema.episodes.length < EPISODES_MAX ? [{ libelle: "Écrire l'épisode suivant avec Claude", demande: { type: "episode-suivant" as const } }] : [];

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

      <AideDeClaude
        cinema={cinema}
        gestes={gestes}
        etat={assistant.etat}
        demander={(d) => void assistant.demander(d)}
        garder={() => assistant.garder((c) => setChoisi(c.episodes.at(-1)?.id ?? episode.id))}
        refuser={assistant.refuser}
        autre={assistant.autre}
        avecRappel
      />

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
          versionsDesPlans={versionsDesPlans}
          blocage={blocage}
          references={references}
          modifierLaSerie={modifierLaSerie}
          onGenerer={onGenerer}
        />
      ))}
      {episode.scenes.length < SCENES_PAR_EPISODE.max && (
        <button type="button" className="film-btn film-btn-ghost" onClick={() => modifierLaSerie((c) => ajouterUneScene(c, episode.id))}>
          Ajouter une scène
        </button>
      )}
      <RenduDeLEpisode key={episode.id} filmId={filmId} episodeId={episode.id} titre={episode.titre} declinaisons={declinaisons} avantDeRendre={enregistrer} />
    </div>
  );
}
