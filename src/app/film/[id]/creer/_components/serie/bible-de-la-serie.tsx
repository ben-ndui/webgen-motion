"use client";

import { ajouterUnElement, ajouterUnPersonnage, retirerUnElement, retirerUnPersonnage } from "@/lib/cinema/edition-serie";
import type { CinemaDuFilm, TypeDElement } from "../../../../../../../remotion/film/cinema/types";
import CarteDeReference from "./carte-de-reference";
import type { useBible } from "./use-bible";

/** Une référence identifiée, avec un nom et une description : personnage ou élément. */
type ReferenceModifiable = { id: string; nom: string; description: string };

function modifierLesTextes<T extends ReferenceModifiable>(liste: T[], id: string, nom: string, description: string): void {
  const cible = liste.find((item) => item.id === id);
  if (cible) {
    cible.nom = nom;
    cible.description = description;
  }
}

type Props = {
  filmId: string;
  cinema: CinemaDuFilm;
  modifierLaSerie: (changement: (cinema: CinemaDuFilm) => void) => void;
  // Remontée dans SerieDuFilm : les plans en ont besoin aussi (raisonDeNePasGenerer).
  bible: ReturnType<typeof useBible>;
};

const BOUTONS_D_ELEMENT: { type: TypeDElement; libelle: string }[] = [
  { type: "creature", libelle: "Ajouter une créature" },
  { type: "objet", libelle: "Ajouter un objet" },
  { type: "decor", libelle: "Ajouter un décor" },
];

/**
 * La bible visuelle de la série : chaque personnage, créature, objet et
 * décor, avec ses vues de référence (face, trois-quarts, profil, en pied, ou
 * une seule image), générées ou importées, validées avant de partir à Veo.
 */
export default function BibleDeLaSerie({ filmId, cinema, modifierLaSerie, bible }: Props) {
  const modifierLePersonnage = (id: string) => (nom: string, description: string) => modifierLaSerie((c) => modifierLesTextes(c.personnages, id, nom, description));
  const modifierLElement = (id: string) => (nom: string, description: string) => modifierLaSerie((c) => modifierLesTextes(c.elements ?? [], id, nom, description));

  return (
    <section className="bloc bible" aria-label="La bible visuelle">
      <h3 className="bloc-titre">La bible visuelle</h3>
      <p className="champ-aide">
        Chaque référence garde le même visage ou le même objet d&apos;un plan et d&apos;un épisode à l&apos;autre. Valide-la une fois satisfait : c&apos;est
        elle, et elle seule, qui part en génération.
      </p>
      {bible.erreur && (
        <p className="depot-erreur" role="alert">
          {bible.erreur}
        </p>
      )}
      {cinema.personnages.map((personnage) => (
        <CarteDeReference
          key={personnage.id}
          filmId={filmId}
          cinema={cinema}
          id={personnage.id}
          type="personnage"
          nom={personnage.nom}
          description={personnage.description}
          fiche={bible.references?.find((r) => r.id === personnage.id)?.fiche}
          etats={bible.etats}
          modifierLesTextes={modifierLePersonnage(personnage.id)}
          modifierLaSerie={modifierLaSerie}
          onGenerer={(vue) => void bible.generer(personnage.id, vue)}
          onImporter={(vue, fichier, droits) => void bible.importer(personnage.id, vue, fichier, droits)}
          onRetenir={(vue, n) => void bible.retenir(personnage.id, vue, n)}
          onChoisirPrincipale={(vue) => void bible.choisirPrincipale(personnage.id, vue)}
          onValider={() => void bible.valider(personnage.id)}
          onDeverrouiller={(motif) => void bible.deverrouiller(personnage.id, motif)}
          onRetirer={() => modifierLaSerie((c) => retirerUnPersonnage(c, personnage.id))}
        />
      ))}
      {(cinema.elements ?? []).map((element) => (
        <CarteDeReference
          key={element.id}
          filmId={filmId}
          cinema={cinema}
          id={element.id}
          type={element.type}
          nom={element.nom}
          description={element.description}
          fiche={bible.references?.find((r) => r.id === element.id)?.fiche}
          etats={bible.etats}
          modifierLesTextes={modifierLElement(element.id)}
          modifierLaSerie={modifierLaSerie}
          onGenerer={(vue) => void bible.generer(element.id, vue)}
          onImporter={(vue, fichier, droits) => void bible.importer(element.id, vue, fichier, droits)}
          onRetenir={(vue, n) => void bible.retenir(element.id, vue, n)}
          onChoisirPrincipale={(vue) => void bible.choisirPrincipale(element.id, vue)}
          onValider={() => void bible.valider(element.id)}
          onDeverrouiller={(motif) => void bible.deverrouiller(element.id, motif)}
          onRetirer={() => modifierLaSerie((c) => retirerUnElement(c, element.id))}
        />
      ))}
      <div className="bible-ajouts">
        <button type="button" className="film-btn film-btn-ghost" onClick={() => modifierLaSerie(ajouterUnPersonnage)}>
          Ajouter un personnage
        </button>
        {BOUTONS_D_ELEMENT.map(({ type, libelle }) => (
          <button key={type} type="button" className="film-btn film-btn-ghost" onClick={() => modifierLaSerie((c) => ajouterUnElement(c, type))}>
            {libelle}
          </button>
        ))}
      </div>
    </section>
  );
}
