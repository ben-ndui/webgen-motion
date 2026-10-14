"use client";

/* eslint-disable @next/next/no-img-element -- planche contact locale, servie par l'API du film */

import { useRef, useState } from "react";

import { poserLaDecoupe } from "@/lib/cinema/edition-serie";
import { DUREE_D_UN_PLAN, type PlanDeCinema } from "../../../../../../../remotion/film/cinema/types";

type Props = {
  filmId: string;
  plan: PlanDeCinema;
  fichier: string;
  version: number;
  modifierLePlan: (changement: (plan: PlanDeCinema) => void) => void;
};

// La planche : une image toutes les demi-secondes (lib/cinema/decoupe.ts).
const IMAGES_DE_LA_PLANCHE = 16;
const enSecondes = (s: number) => `${s.toFixed(1).replace(".", ",")} s`;

/**
 * Choisir le morceau gardé d'un plan : on le regarde (lecteur + planche
 * contact cliquable), puis « Commencer ici », « Finir ici », ou « Retirer un
 * passage » en deux clics. Le montage de l'épisode suit cette découpe.
 */
export default function DecoupeDuPlan({ filmId, plan, fichier, version, modifierLePlan }: Props) {
  const lecteur = useRef<HTMLVideoElement>(null);
  const [debutDuPassage, setDebutDuPassage] = useState<number | null>(null);
  const actuelle = plan.decoupe ?? { debut: 0, fin: DUREE_D_UN_PLAN };
  const maintenant = () => lecteur.current?.currentTime ?? 0;
  const poser = (voulue: { debut: number; fin: number; coupe?: [number, number] }) => modifierLePlan((p) => poserLaDecoupe(p, voulue));
  const base = `/api/motion/film/${filmId}`;

  const allerA = (evenement: React.MouseEvent<HTMLImageElement>) => {
    const boite = evenement.currentTarget.getBoundingClientRect();
    const index = Math.floor(((evenement.clientX - boite.left) / boite.width) * IMAGES_DE_LA_PLANCHE);
    if (lecteur.current) lecteur.current.currentTime = Math.min(DUREE_D_UN_PLAN, Math.max(0, index * 0.5));
  };

  const retirerUnPassage = () => {
    if (debutDuPassage === null) {
      setDebutDuPassage(maintenant());
      return;
    }
    poser({ ...actuelle, coupe: [debutDuPassage, maintenant()] });
    setDebutDuPassage(null);
  };

  return (
    <div className="champ decoupe">
      <span className="champ-question">Le morceau gardé</span>
      <p className="champ-aide">
        {`De ${enSecondes(actuelle.debut)} à ${enSecondes(actuelle.fin)}`}
        {actuelle.coupe ? `, sans le passage de ${enSecondes(actuelle.coupe[0])} à ${enSecondes(actuelle.coupe[1])}` : ""}. Clique une image de la planche
        pour y amener le lecteur.
      </p>
      <video ref={lecteur} className="decoupe-lecteur" src={`${base}/media?relatif=${encodeURIComponent(fichier)}&v=${version}`} controls playsInline />
      <img className="decoupe-planche" src={`${base}/cinema/plans/${encodeURIComponent(plan.id)}/planche?v=${version}`} alt="Planche contact du plan, une image toutes les demi-secondes" onClick={allerA} />
      <div className="decoupe-actions">
        <button type="button" className="film-btn film-btn-ghost" onClick={() => poser({ ...actuelle, debut: maintenant() })}>
          Commencer ici
        </button>
        <button type="button" className="film-btn film-btn-ghost" onClick={() => poser({ ...actuelle, fin: maintenant() })}>
          Finir ici
        </button>
        <button type="button" className="film-btn film-btn-ghost" aria-pressed={debutDuPassage !== null} onClick={retirerUnPassage}>
          {debutDuPassage === null ? "Retirer un passage" : `Le passage retiré finit ici (début à ${enSecondes(debutDuPassage)})`}
        </button>
        {plan.decoupe && (
          <button type="button" className="lien" onClick={() => modifierLePlan((p) => void delete p.decoupe)}>
            Tout garder
          </button>
        )}
      </div>
    </div>
  );
}
