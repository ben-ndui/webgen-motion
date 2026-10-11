"use client";

import type { FilmSpec, Langue } from "../../../../../../remotion/film/spec";
import BibliothequeMusique from "./bibliotheque-musique";
import CaseDeDepot from "./case-de-depot";
import type { RoleDeDepot } from "./use-fiche-du-film";
import VoixOff from "./voix-off";

type Props = {
  id: string;
  fiche: FilmSpec;
  langues: Langue[];
  musiquePresente: boolean;
  deposer: (role: RoleDeDepot, fichier: File | null, relatif?: string) => Promise<string | null>;
  modifier: (changement: (copie: FilmSpec) => void) => void;
  enregistrer: () => Promise<boolean>;
  recharger: () => Promise<void>;
};

function duree(tempo: number): string {
  return `${Math.round((60 / tempo) * 4 * 10) / 10} s`;
}

/**
 * Étape 2, le son : la musique (déposée, ou prise dans la bibliothèque de
 * GEN MOTION), mesurée au dépôt, son volume, puis la voix off.
 */
export default function EtapeMusique({ id, fiche, langues, musiquePresente, deposer, modifier, enregistrer, recharger }: Props) {
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
            <div><dt>Morceau</dt><dd>{musique.titre}</dd></div>
            <div><dt>Tempo mesuré</dt><dd>{musique.tempo.toLocaleString("fr-FR")} BPM</dd></div>
            <div><dt>Une mesure dure</dt><dd>{duree(musique.tempo)}</dd></div>
          </dl>
        )}
        <label className="champ">
          <span className="champ-question">Volume de la musique : {Math.round((musique.volume ?? 1) * 100)} %</span>
          <input type="range" min={0} max={100} value={Math.round((musique.volume ?? 1) * 100)}
            onChange={(e) => modifier((c) => { c.musique.volume = Number(e.target.value) / 100; })} />
        </label>
      </section>

      <section className="bloc" aria-labelledby="bloc-bibliotheque">
        <h3 id="bloc-bibliotheque" className="bloc-titre">Ou dans ta bibliothèque</h3>
        <p className="champ-aide">Les morceaux déjà dans GEN MOTION, ceux de tes tours.</p>
        <BibliothequeMusique titreActuel={musique.titre} onChoisir={(morceau) => deposer("bibliotheque", null, morceau)} />
      </section>

      <VoixOff id={id} fiche={fiche} langues={langues} modifier={modifier} enregistrer={enregistrer} recharger={recharger} />
    </div>
  );
}
