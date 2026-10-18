"use client";

import { useState } from "react";

import type { CinemaDuFilm, EpisodeAVenir } from "../../../../../../../remotion/film/cinema/types";

type Props = {
  cinema: CinemaDuFilm;
  modifierLaSerie: (changement: (cinema: CinemaDuFilm) => void) => void;
};

/**
 * Les briefs d'épisodes pas encore écrits (import de la bible, le plus
 * souvent) : à copier dans « Ce que veut la cliente », puis à retirer une
 * fois l'épisode écrit. Rien ici n'écrit un épisode tout seul.
 */
// Par titre, pas par position : « Retirer » un épisode plus haut dans la
// liste ne doit pas faire sauter l'indicateur « Copié ! » sur un autre.
type EtatDeCopie = { titre: string; ok: boolean };

export default function EpisodesAVenir({ cinema, modifierLaSerie }: Props) {
  const episodes = cinema.episodesAVenir ?? [];
  const [copie, setCopie] = useState<EtatDeCopie | null>(null);
  if (episodes.length === 0) return null;

  const retirer = (index: number) =>
    modifierLaSerie((c) => {
      c.episodesAVenir = (c.episodesAVenir ?? []).filter((_, i) => i !== index);
    });

  const copier = async (episode: EpisodeAVenir) => {
    try {
      await navigator.clipboard.writeText(episode.note);
      setCopie({ titre: episode.titre, ok: true });
    } catch {
      // Presse-papier indisponible (permission refusée, contexte non sécurisé) :
      // le texte reste affiché en entier juste au-dessus, sélectionnable à la main.
      setCopie({ titre: episode.titre, ok: false });
    }
    setTimeout(() => setCopie((actuel) => (actuel?.titre === episode.titre ? null : actuel)), 1600);
  };

  return (
    <section className="bloc episodes-a-venir" aria-label="Épisodes à venir">
      <h3 className="bloc-titre">Épisodes à venir ({episodes.length})</h3>
      <p className="champ-aide">Copie un brief dans « Ce que veut la cliente », puis retire-le d&apos;ici une fois l&apos;épisode écrit.</p>
      <ol>
        {episodes.map((episode, index) => (
          <li key={`${episode.titre}-${index}`} className="episode-a-venir">
            <p>
              <b>{episode.titre}</b>
            </p>
            <p className="champ-aide">{episode.note}</p>
            <div className="aide-claude-gestes">
              <button type="button" className="film-btn film-btn-ghost" onClick={() => void copier(episode)}>
                {copie?.titre === episode.titre ? (copie.ok ? "Copié !" : "Copie impossible") : "Copier le brief"}
              </button>
              <button type="button" className="lien" onClick={() => retirer(index)}>
                Retirer
              </button>
            </div>
            {copie?.titre === episode.titre && !copie.ok && <p className="champ-aide">Sélectionne le texte ci-dessus à la main.</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}
