"use client";

import { useState } from "react";

import { ajouterUnElement, ajouterUnPersonnage, retirerUnElement, retirerUnPersonnage } from "@/lib/cinema/edition-serie";
import HorsDuFlux from "@/app/_components/hors-du-flux";
import type { CinemaDuFilm, TypeDElement } from "../../../../../../../remotion/film/cinema/types";
import CarteDeReference from "./carte-de-reference";
import FenetreDeReference from "./fenetre-de-reference";
import ReferenceTuile from "./reference-tuile";
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

const FICHE_PAR_DEFAUT = { statut: "propose" as const, vues: {}, journal: [] };

/**
 * La bible visuelle de la série : chaque personnage, créature, objet et
 * décor, avec ses vues de référence (face, trois-quarts, profil, en pied, ou
 * une seule image), générées ou importées, validées avant de partir à Veo.
 *
 * Une tuile compacte par référence (grille façon tableau de bord) ; cliquer
 * en ouvre le détail complet dans une fenêtre — une bible de 8-10
 * personnages tous dépliés à la suite rendait la page interminable.
 */
export default function BibleDeLaSerie({ filmId, cinema, modifierLaSerie, bible }: Props) {
  const [ouverte, setOuverte] = useState<string | null>(null);
  const modifierLePersonnage = (id: string) => (nom: string, description: string) => modifierLaSerie((c) => modifierLesTextes(c.personnages, id, nom, description));
  const modifierLElement = (id: string) => (nom: string, description: string) => modifierLaSerie((c) => modifierLesTextes(c.elements ?? [], id, nom, description));

  const personnageOuvert = cinema.personnages.find((p) => p.id === ouverte);
  const elementOuvert = (cinema.elements ?? []).find((e) => e.id === ouverte);

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
      <div className="grid reference-grille">
        {cinema.personnages.map((personnage) => (
          <ReferenceTuile
            key={personnage.id}
            filmId={filmId}
            type="personnage"
            nom={personnage.nom}
            fiche={bible.references?.find((r) => r.id === personnage.id)?.fiche ?? FICHE_PAR_DEFAUT}
            onOuvrir={() => setOuverte(personnage.id)}
          />
        ))}
        {(cinema.elements ?? []).map((element) => (
          <ReferenceTuile
            key={element.id}
            filmId={filmId}
            type={element.type}
            nom={element.nom}
            fiche={bible.references?.find((r) => r.id === element.id)?.fiche ?? FICHE_PAR_DEFAUT}
            onOuvrir={() => setOuverte(element.id)}
          />
        ))}
      </div>
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
      {/* Hors de .panel : son animation d'entrée en transform (gmPanelIn) en
          fait un conteneur de position le temps du montage, et la fenêtre se
          posait à l'intérieur du panneau au lieu de couvrir l'écran. */}
      <HorsDuFlux racine=".gm-film">
      {personnageOuvert && (
        <FenetreDeReference type="personnage" nom={personnageOuvert.nom} fermer={() => setOuverte(null)}>
          <CarteDeReference
            filmId={filmId}
            cinema={cinema}
            id={personnageOuvert.id}
            type="personnage"
            nom={personnageOuvert.nom}
            description={personnageOuvert.description}
            fiche={bible.references?.find((r) => r.id === personnageOuvert.id)?.fiche}
            etats={bible.etats}
            modifierLesTextes={modifierLePersonnage(personnageOuvert.id)}
            modifierLaSerie={modifierLaSerie}
            onGenerer={(vue) => void bible.generer(personnageOuvert.id, vue)}
            onImporter={(vue, fichier, droits) => void bible.importer(personnageOuvert.id, vue, fichier, droits)}
            onRetenir={(vue, n) => void bible.retenir(personnageOuvert.id, vue, n)}
            onChoisirPrincipale={(vue) => void bible.choisirPrincipale(personnageOuvert.id, vue)}
            onValider={() => void bible.valider(personnageOuvert.id)}
            onDeverrouiller={(motif) => void bible.deverrouiller(personnageOuvert.id, motif)}
            onRetirer={() => {
              modifierLaSerie((c) => retirerUnPersonnage(c, personnageOuvert.id));
              setOuverte(null);
            }}
          />
        </FenetreDeReference>
      )}
      {elementOuvert && (
        <FenetreDeReference type={elementOuvert.type} nom={elementOuvert.nom} fermer={() => setOuverte(null)}>
          <CarteDeReference
            filmId={filmId}
            cinema={cinema}
            id={elementOuvert.id}
            type={elementOuvert.type}
            nom={elementOuvert.nom}
            description={elementOuvert.description}
            fiche={bible.references?.find((r) => r.id === elementOuvert.id)?.fiche}
            etats={bible.etats}
            modifierLesTextes={modifierLElement(elementOuvert.id)}
            modifierLaSerie={modifierLaSerie}
            onGenerer={(vue) => void bible.generer(elementOuvert.id, vue)}
            onImporter={(vue, fichier, droits) => void bible.importer(elementOuvert.id, vue, fichier, droits)}
            onRetenir={(vue, n) => void bible.retenir(elementOuvert.id, vue, n)}
            onChoisirPrincipale={(vue) => void bible.choisirPrincipale(elementOuvert.id, vue)}
            onValider={() => void bible.valider(elementOuvert.id)}
            onDeverrouiller={(motif) => void bible.deverrouiller(elementOuvert.id, motif)}
            onRetirer={() => {
              modifierLaSerie((c) => retirerUnElement(c, elementOuvert.id));
              setOuverte(null);
            }}
          />
        </FenetreDeReference>
      )}
      </HorsDuFlux>
    </section>
  );
}
