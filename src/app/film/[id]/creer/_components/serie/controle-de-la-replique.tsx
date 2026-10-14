"use client";

import { useEffect, useState } from "react";

import type { ControleDeLaReplique as Controle } from "@/lib/cinema/controle-replique";

// Le parent recrée ce composant (key) quand la vidéo ou la réplique change : un nouveau contrôle repart de zéro.
type Props = { filmId: string; planId: string };
type Etat = { etat: "ecoute" } | { etat: "fait"; controle: Controle } | { etat: "erreur"; raison: string };

/**
 * Sous un plan prêt qui a une réplique : l'a-t-on vraiment entendue ? Un plan
 * prêt n'est pas un plan réussi, Veo peut rendre la scène en silence.
 */
export default function ControleDeLaReplique({ filmId, planId }: Props) {
  const [etat, setEtat] = useState<Etat>({ etat: "ecoute" });

  useEffect(() => {
    let annule = false;
    fetch(`/api/motion/film/${filmId}/cinema/plans/${encodeURIComponent(planId)}/replique`, { cache: "no-store" })
      .then(async (reponse) => {
        const corps = (await reponse.json().catch(() => ({}))) as { controle?: Controle; erreur?: string };
        if (annule) return;
        if (!reponse.ok || !corps.controle) setEtat({ etat: "erreur", raison: corps.erreur ?? "Contrôle impossible." });
        else setEtat({ etat: "fait", controle: corps.controle });
      })
      .catch(() => !annule && setEtat({ etat: "erreur", raison: "GEN MOTION ne répond pas." }));
    return () => {
      annule = true;
    };
  }, [filmId, planId]);

  if (etat.etat === "ecoute") return <p className="champ-aide" role="status">Écoute de la réplique…</p>;
  if (etat.etat === "erreur") return <p className="champ-aide">{etat.raison}</p>;
  const { controle } = etat;
  if (controle.statut === "indisponible") return <p className="champ-aide">{controle.raison}</p>;
  if (controle.statut === "dite") return <p className="champ-aide replique-dite">Réplique entendue : « {controle.entendu} »</p>;
  return (
    <p className="depot-erreur" role="alert">
      {controle.entendu ? `La réplique n'est pas dite comme demandé. Entendu : « ${controle.entendu} ». ` : "Aucune voix entendue dans ce plan. "}
      Refais le plan si la réplique compte.
    </p>
  );
}
