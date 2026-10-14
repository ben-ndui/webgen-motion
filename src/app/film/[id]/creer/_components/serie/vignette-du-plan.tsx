"use client";

import { EXEMPLES_DE_SERIE } from "../../../../../../../remotion/film/cinema/exemples";
import type { PlanDeCinema } from "../../../../../../../remotion/film/cinema/types";
import type { SuiviDUnPlan } from "./use-suivi-des-plans";

type Props = {
  filmId: string;
  numero: number;
  plan: PlanDeCinema;
  suivi: SuiviDUnPlan | undefined;
  noms: string[];
  choisi: boolean;
  onChoisir: () => void;
};

const ETIQUETTES: Partial<Record<SuiviDUnPlan["etat"] | "lecture", string>> = {
  lecture: "…",
  "en-cours": "En cours",
  chargement: "Envoi…",
  refuse: "Refusé",
  injoignable: "En attente",
  erreur: "Bloqué",
};

/**
 * Un plan sur la pellicule de sa scène : l'image 9:16 telle qu'elle sortira.
 * Prêt, il joue sa vidéo ; sinon il montre ce qui doit s'y passer.
 */
export default function VignetteDuPlan({ filmId, numero, plan, suivi, noms, choisi, onChoisir }: Props) {
  // Pas encore de réponse du serveur : on lit, on n'envoie rien.
  const etat = suivi?.etat ?? "lecture";
  const pret = suivi?.etat === "pret" ? suivi : null;
  const consigne = plan.consigne.trim() === EXEMPLES_DE_SERIE.consigne ? "Plan à écrire" : plan.consigne;
  const etiquette = ETIQUETTES[etat];

  return (
    <li>
      <button type="button" className={`vignette${choisi ? " choisie" : ""}`} aria-pressed={choisi} onClick={onChoisir}>
        <span className={`vignette-image etat-${etat}`}>
          {pret ? (
            <video src={`/api/motion/film/${filmId}/media?relatif=${encodeURIComponent(pret.fichier)}`} muted loop playsInline autoPlay aria-hidden />
          ) : (
            <span className="vignette-consigne">{consigne}</span>
          )}
          {etiquette && <span className="vignette-etat">{etiquette}</span>}
        </span>
        <span className="vignette-legende">
          <b>Plan {numero}</b>
          <span>{noms.length > 0 ? noms.join(", ") : plan.objet ? "L'objet seul" : "Sans personnage"}</span>
        </span>
      </button>
    </li>
  );
}
