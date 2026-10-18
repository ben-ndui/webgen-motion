"use client";

import Link from "next/link";
import { useState } from "react";

import type { FicheDeFormat } from "@/lib/formats/catalogue";
import { languesDesDeclinaisons } from "@/lib/formats/declinaisons";
import type { ConteSpec } from "../../../../../../remotion/film/conte/spec";
import type { ExplainerSpec } from "../../../../../../remotion/film/explainer/spec";
import type { KaraokeSpec } from "../../../../../../remotion/film/karaoke/spec";
import type { Langue } from "../../../../../../remotion/film/spec";
import ChoixDeCases from "../../../../_components/choix-de-cases";
import { LANGUES_DU_FILM } from "../../../../_components/choix-du-film";
import IndicateurDEnregistrement from "../../../../film/[id]/creer/_components/indicateur-d-enregistrement";
import BlocDeclinaisons from "./bloc-declinaisons";
import BlocMarque from "./bloc-marque";
import EditeurConte from "./editeur-conte";
import EditeurExplainer from "./editeur-explainer";
import EditeurKaraoke from "./editeur-karaoke";
import { type EtatDuProjet, useProjetDeFormat } from "./use-projet-de-format";

/**
 * L'éditeur d'un projet de format : ce qui est commun (marque, langues et
 * formats), puis le contenu propre au format, écrit une langue à la fois.
 * Enregistré tout seul ; ce qui reste à écrire et les erreurs se relisent
 * sur le serveur après chaque enregistrement.
 */
export default function EditeurDuFormat({ id, initial, morceauPresent = false }: { id: string; initial: EtatDuProjet; morceauPresent?: boolean }) {
  const { projet, erreurs, aEcrire, enregistrement, modifier, enregistrer, reprendreDuServeur } = useProjetDeFormat(id, initial);
  const [morceauDepose, setMorceauDepose] = useState(morceauPresent);
  const langues = languesDesDeclinaisons(projet.spec.declinaisons);
  const [langue, setLangue] = useState<Langue>(langues[0] ?? "fr");
  const enCours = langues.includes(langue) ? langue : (langues[0] ?? "fr");

  return (
    <div className="assistant" data-wm-id="format.editeur">
      <div className="assistant-barre">
        <Link className="film-btn film-btn-ghost" href={`/format/${id}`}>Retour au projet</Link>
        <IndicateurDEnregistrement etat={enregistrement} onReessayer={() => void enregistrer()} />
      </div>

      {aEcrire.length > 0 ? (
        <div className="film-warning" role="note" data-wm-id="format.a-ecrire">
          <p>{`${aEcrire.length} texte${aEcrire.length > 1 ? "s" : ""} encore celui de l'exemple : le rendu attend que tu les écrives.`}</p>
          <p className="film-muted">
            Ils sont vraiment les tiens (ton titre est celui de l&apos;exemple, par exemple) ?{" "}
            <button type="button" className="lien" data-wm-id="format.confirmer"
              onClick={() => modifier((copie) => { copie.confirmes = [...new Set([...(copie.confirmes ?? []), ...aEcrire])]; })}>
              Ce sont bien les miens
            </button>
          </p>
        </div>
      ) : (
        <p className="film-muted" role="status">Tous les textes sont les tiens.</p>
      )}
      {erreurs.length > 0 && (
        <details className="film-block film-alert">
          <summary>{erreurs.length} point{erreurs.length > 1 ? "s" : ""} à compléter avant le rendu</summary>
          <ul className="film-list">
            {erreurs.map((erreur) => <li key={erreur}><code>{erreur}</code></li>)}
          </ul>
        </details>
      )}

      <div className="blocs">
        <BlocMarque marque={projet.spec.marque} pour={projet.format === "karaoke" ? "artiste" : "marque"}
          modifier={(changement) => modifier((copie) => { changement(copie.spec.marque); })} />
        <BlocDeclinaisons format={projet.format} declinaisons={projet.spec.declinaisons} avecFormats={projet.format !== "karaoke"}
          modifier={(declinaisons) => modifier((copie) => { copie.spec.declinaisons = declinaisons; })} />
      </div>

      {langues.length > 1 && (
        <ChoixDeCases titre="Langue des textes" options={LANGUES_DU_FILM.filter((l) => langues.includes(l.valeur))} valeurs={[enCours]}
          onChange={(v) => setLangue(v[0] as Langue)} />
      )}

      {projet.format === "explainer" ? (
        <EditeurExplainer id={id} spec={projet.spec} langue={enCours}
          modifier={(changement) => modifier((copie) => ({ ...copie, spec: changement(copie.spec as ExplainerSpec) ?? copie.spec } as FicheDeFormat))} />
      ) : projet.format === "conte" ? (
        <EditeurConte spec={projet.spec} langue={enCours}
          modifier={(changement) => modifier((copie) => ({ ...copie, spec: changement(copie.spec as ConteSpec) ?? copie.spec } as FicheDeFormat))} />
      ) : (
        <EditeurKaraoke id={id} spec={projet.spec} langue={enCours} morceauPresent={morceauDepose} enregistrer={enregistrer}
          modifier={(changement) => modifier((copie) => ({ ...copie, spec: changement(copie.spec as KaraokeSpec) ?? copie.spec } as FicheDeFormat))}
          apresLeDepot={() => {
            setMorceauDepose(true);
            void reprendreDuServeur((local, serveur) => {
              if (local.format === "karaoke" && serveur.format === "karaoke") local.spec.morceau = { ...serveur.spec.morceau, titre: local.spec.morceau.titre, artiste: local.spec.morceau.artiste };
              return local;
            });
          }} />
      )}
    </div>
  );
}
