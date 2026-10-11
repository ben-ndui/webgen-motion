"use client";

import type { FilmSpec } from "../../../../../../remotion/film/spec";
import CaseDeDepot from "./case-de-depot";
import type { RoleDeDepot } from "./use-fiche-du-film";

type Props = {
  fiche: FilmSpec;
  musiquePresente: boolean;
  deposer: (role: RoleDeDepot, fichier: File) => Promise<string | null>;
};

function duree(secondes: number): string {
  return `${Math.round((60 / secondes) * 4 * 10) / 10} s`;
}

/**
 * Étape 2 : la musique. Le film se coupe sur ses temps : on mesure le
 * morceau au dépôt (tempo, premier temps), personne n'a à les connaître.
 */
export default function EtapeMusique({ fiche, musiquePresente, deposer }: Props) {
  const { musique } = fiche;
  return (
    <div className="blocs">
      <section className="bloc" aria-labelledby="bloc-musique">
        <h3 id="bloc-musique" className="bloc-titre">Ta musique</h3>
        <p className="champ-aide">
          Un morceau d&apos;au moins 20 secondes, avec un rythme marqué : le montage tombe sur ses temps. Utilise une
          musique libre de droits pour un usage commercial (Pixabay, Artlist, Epidemic Sound…).
        </p>
        <CaseDeDepot
          titre="Morceau"
          format="paysage"
          accepte=".mp3,.m4a,.wav,.aac,.ogg,audio/*"
          present={musiquePresente}
          resume={musique.titre}
          onDeposer={(fichier) => deposer("musique", fichier)}
        />
        {musiquePresente && (
          <dl className="mesures">
            <div>
              <dt>Morceau</dt>
              <dd>{musique.titre}</dd>
            </div>
            <div>
              <dt>Tempo mesuré</dt>
              <dd>{musique.tempo.toLocaleString("fr-FR")} BPM</dd>
            </div>
            <div>
              <dt>Une mesure dure</dt>
              <dd>{duree(musique.tempo)}</dd>
            </div>
          </dl>
        )}
      </section>
    </div>
  );
}
