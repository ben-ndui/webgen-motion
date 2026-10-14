"use client";

import { ajouterUnPersonnage, retirerUnPersonnage } from "@/lib/cinema/edition-serie";
import type { CinemaDuFilm, Personnage } from "../../../../../../../remotion/film/cinema/types";
import { PERSONNAGES_MAX } from "../../../../../../../remotion/film/cinema/validerCinema";
import CartePersonnage from "./carte-personnage";
import type { EtatDuPortrait } from "./use-portraits";
import type { SuiviDUnPlan } from "./use-suivi-des-plans";

type Props = {
  filmId: string;
  cinema: CinemaDuFilm;
  etats: Record<string, EtatDuPortrait>;
  suivis: Record<string, SuiviDUnPlan>;
  // Change quand un portrait est refait : l'image se recharge.
  versions: Record<string, number>;
  modifierLaSerie: (changement: (cinema: CinemaDuFilm) => void) => void;
  onGenererLePortrait: (personnageId: string) => void;
};

/** Les personnages de la série, chacun avec son portrait de référence. */
export default function Casting({ filmId, cinema, etats, suivis, versions, modifierLaSerie, onGenererLePortrait }: Props) {
  const plans = cinema.episodes.flatMap((e) => e.scenes.flatMap((s) => s.plans));
  const plansGeneresAvec = (id: string) => plans.filter((p) => p.personnages.includes(id) && suivis[p.id]?.etat === "pret").length;
  const modifierLePersonnage = (id: string) => (changement: (personnage: Personnage) => void) =>
    modifierLaSerie((c) => {
      const copie = c.personnages.find((p) => p.id === id);
      if (copie) changement(copie);
    });

  return (
    <section className="bloc casting" aria-label="Le casting">
      <h3 className="bloc-titre">Le casting</h3>
      <p className="champ-aide">
        Chaque personnage a un portrait, généré une fois : c&apos;est lui qui garde le même visage d&apos;un plan et d&apos;un épisode à l&apos;autre. Les
        personnages sont fictifs.
      </p>
      {cinema.personnages.length === 0 && <p className="champ-aide">Aucun personnage : une série peut aussi ne montrer que des lieux et des objets.</p>}
      {cinema.personnages.map((personnage) => (
        <CartePersonnage
          key={personnage.id}
          filmId={filmId}
          personnage={personnage}
          version={versions[personnage.id] ?? 0}
          etat={etats[personnage.id] ?? { etat: "repos" }}
          plansDejaGeneres={plansGeneresAvec(personnage.id)}
          modifier={modifierLePersonnage(personnage.id)}
          onGenererLePortrait={() => onGenererLePortrait(personnage.id)}
          onRetirer={() => modifierLaSerie((c) => retirerUnPersonnage(c, personnage.id))}
        />
      ))}
      {cinema.personnages.length < PERSONNAGES_MAX && (
        <button type="button" className="film-btn film-btn-ghost" onClick={() => modifierLaSerie(ajouterUnPersonnage)}>
          Ajouter un personnage
        </button>
      )}
    </section>
  );
}
