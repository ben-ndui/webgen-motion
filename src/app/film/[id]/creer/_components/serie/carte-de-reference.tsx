"use client";

import { useState } from "react";

import type { FicheVisuelle, TypeDeReference, VueDeReference } from "@/lib/cinema/bible/etat";
import { NOM_DU_TYPE, VUES_DU_TYPE } from "@/lib/cinema/bible/etat";
import { EXEMPLES_DE_SERIE, estUnExemple } from "../../../../../../../remotion/film/cinema/exemples";
import type { CinemaDuFilm } from "../../../../../../../remotion/film/cinema/types";
import AideDeClaude from "./aide-de-claude";
import { useAssistant } from "./use-assistant";
import type { EtatDeLaVue } from "./use-bible";
import VueDeLaBible from "./vue-de-la-bible";
import ZoneTexte from "./zone-texte";

type Props = {
  filmId: string;
  cinema: CinemaDuFilm;
  id: string;
  type: TypeDeReference;
  nom: string;
  description: string;
  // Sa fiche visuelle (bible.json) : absente tant que la bible n'a pas fini de se charger.
  fiche: FicheVisuelle | undefined;
  etats: Record<string, EtatDeLaVue>;
  modifierLesTextes: (nom: string, description: string) => void;
  modifierLaSerie: (changement: (cinema: CinemaDuFilm) => void) => void;
  onGenerer: (vue: VueDeReference) => void;
  onImporter: (vue: VueDeReference, fichier: File, droitsDeclares: boolean) => void;
  onRetenir: (vue: VueDeReference, n: number) => void;
  onChoisirPrincipale: (vue: VueDeReference) => void;
  onValider: () => void;
  onDeverrouiller: (motif: string) => void;
  onRetirer: () => void;
};

const FICHE_PAR_DEFAUT: FicheVisuelle = { statut: "propose", vues: {}, journal: [] };

/** Une référence de la bible (personnage, créature, objet ou décor) : ses textes, ses vues, et son verrou. */
export default function CarteDeReference({ filmId, cinema, id, type, nom, description, fiche = FICHE_PAR_DEFAUT, etats, modifierLesTextes, modifierLaSerie, onGenerer, onImporter, onRetenir, onChoisirPrincipale, onValider, onDeverrouiller, onRetirer }: Props) {
  const [motif, setMotif] = useState<string | null>(null);
  const verrouillee = fiche.statut === "valide";
  const vues = VUES_DU_TYPE[type];
  const aUneImage = vues.some((v) => fiche.vues[v]?.versions.length);
  const descriptionAEcrire = estUnExemple("description", description);
  const assistant = useAssistant(filmId, cinema, modifierLaSerie);
  // Verrouillée : c'est cette description, mot pour mot, qui part avec l'image validée à Veo.
  const gestes = verrouillee ? [] : [{ libelle: descriptionAEcrire ? "Décrire avec Claude" : "Réécrire avec Claude", demande: { type: "decrire-reference" as const, reference: id } }];

  return (
    <article className="reference-bible" aria-label={`${NOM_DU_TYPE[type]} ${nom}`}>
      <div className="reference-bible-entete">
        <span className="reference-bible-type">{NOM_DU_TYPE[type]}</span>
        <label className="champ">
          <span className="champ-question">Son nom</span>
          <input className="champ-saisie" value={nom} onChange={(e) => modifierLesTextes(e.target.value.trim() === "" ? nom : e.target.value, description)} />
        </label>
      </div>
      <ZoneTexte
        question="À quoi ressemble-t-il ?"
        aide="En une phrase, en anglais (Veo suit mieux l'anglais) : répétée mot pour mot pour garder le même visage ou le même objet."
        exemple={EXEMPLES_DE_SERIE.description}
        valeur={description}
        max={800}
        onChange={(valeur) => modifierLesTextes(nom, valeur)}
      />
      <AideDeClaude cinema={cinema} gestes={gestes} etat={assistant.etat} demander={(d) => void assistant.demander(d)} garder={() => assistant.garder()} refuser={assistant.refuser} autre={assistant.autre} />
      {descriptionAEcrire ? (
        <p className="champ-aide">Décris-le d&apos;abord : les vues se génèrent à partir de la description.</p>
      ) : (
        <div className="reference-bible-vues">
          {vues.map((vue) => (
            <VueDeLaBible
              key={vue}
              filmId={filmId}
              vue={vue}
              etatDeLaVue={fiche.vues[vue]}
              principale={fiche.principale === vue || (fiche.principale === undefined && vues.find((v) => fiche.vues[v]?.versions.length) === vue)}
              plusieursVues={vues.length > 1}
              etat={etats[`${id}/${vue}`] ?? { etat: "repos" }}
              verrouillee={verrouillee}
              onGenerer={() => onGenerer(vue)}
              onImporter={(fichier, droits) => onImporter(vue, fichier, droits)}
              onRetenir={(n) => onRetenir(vue, n)}
              onChoisirPrincipale={() => onChoisirPrincipale(vue)}
            />
          ))}
        </div>
      )}
      <div className="reference-bible-verrou">
        {verrouillee ? (
          motif === null ? (
            <button type="button" className="film-btn film-btn-ghost" onClick={() => setMotif("")}>
              Déverrouiller
            </button>
          ) : (
            <div className="reference-bible-deverrouiller">
              <input className="champ-saisie" placeholder="Pourquoi déverrouiller ? (reste dans l'historique)" value={motif} onChange={(e) => setMotif(e.target.value)} />
              <button
                type="button"
                className="film-btn film-btn-ghost"
                disabled={motif.trim() === ""}
                onClick={() => {
                  onDeverrouiller(motif);
                  setMotif(null);
                }}
              >
                Confirmer
              </button>
              <button type="button" className="lien" onClick={() => setMotif(null)}>
                Annuler
              </button>
            </div>
          )
        ) : (
          <button type="button" className="film-btn" disabled={!aUneImage} onClick={onValider}>
            Valider : c&apos;est elle qui part en génération
          </button>
        )}
        {!verrouillee && !aUneImage && <p className="champ-aide">Génère ou importe au moins une image avant de valider.</p>}
      </div>
      <button type="button" className="lien" onClick={onRetirer}>
        Retirer {type === "personnage" ? "ce personnage" : "cet élément"}
      </button>
    </article>
  );
}
