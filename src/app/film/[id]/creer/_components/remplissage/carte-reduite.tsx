/* eslint-disable @next/next/no-img-element -- capture locale servie par l'API du film */
import { Maximize2, X } from "lucide-react";

import { ETAPES_DU_REMPLISSAGE } from "@/lib/site/etapes-du-remplissage";

import type { EtatDuRemplissage } from "../use-remplissage";
import { adresseDUnApercu } from "./apercus-en-direct";

type Props = {
  id: string;
  etat: Exclude<EtatDuRemplissage, { type: "repos" }>;
  agrandir: () => void;
  fermer: () => void;
};

/**
 * La fenêtre du remplissage, réduite dans le coin : on continue à travailler
 * pendant que GEN MOTION lit le site. Un clic la rouvre en grand.
 */
export default function CarteReduite({ id, etat, agrandir, fermer }: Props) {
  const { avancement } = etat;
  const rang = ETAPES_DU_REMPLISSAGE.findIndex((e) => e.cle === avancement.etape);
  const titre = ETAPES_DU_REMPLISSAGE[rang]?.titre ?? "";
  const derniere = avancement.apercus.at(-1);
  const progression = etat.type === "fait" ? 1 : (rang + 0.5) / ETAPES_DU_REMPLISSAGE.length;

  const entete = { "en-cours": `Étape ${rang + 1} sur ${ETAPES_DU_REMPLISSAGE.length} · ${titre}`, fait: "C'est rempli", erreur: "Le remplissage s'est arrêté" }[etat.type];
  const sousTitre = { "en-cours": avancement.detail, fait: "Voir ce qu'il reste à faire", erreur: etat.type === "erreur" ? etat.message : "" }[etat.type];

  return (
    <div className="remplissage-carte" data-etat={etat.type} data-wm-id="film.remplir.carte">
      <button type="button" className="remplissage-carte-corps" onClick={agrandir} aria-label={`${entete}. Agrandir le suivi du remplissage`}>
        {derniere ? <img src={adresseDUnApercu(id, derniere)} alt="" className="remplissage-carte-apercu" /> : <span className="remplissage-carte-apercu" aria-hidden />}
        <span className="remplissage-carte-textes">
          <span className="remplissage-carte-titre">{entete}</span>
          <span className="remplissage-carte-detail">{sousTitre}</span>
        </span>
        <Maximize2 className="remplissage-carte-icone" aria-hidden />
      </button>
      {etat.type !== "en-cours" && (
        <button type="button" className="remplissage-carte-fermer" onClick={fermer} aria-label="Fermer">
          <X aria-hidden />
        </button>
      )}
      <span className="remplissage-carte-barre" style={{ transform: `scaleX(${progression})` }} aria-hidden />
    </div>
  );
}
