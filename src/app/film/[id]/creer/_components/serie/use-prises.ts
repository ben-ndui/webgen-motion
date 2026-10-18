"use client";

import { useCallback, useEffect, useState } from "react";

import type { DecoupeDuPlan } from "../../../../../../../remotion/film/cinema/types";

export type Prise = { n: number; fichier: string; retenue: boolean; presente: boolean; creeeLe: string | null; produitReel?: true };
export type CeQueCiteLePlan = { fichier?: string; decoupe?: DecoupeDuPlan; produitReel?: true };

/**
 * Les prises d'un plan (lecture + choisir/supprimer), rechargées quand une
 * nouvelle vidéo arrive (`version`). `onPlanChange` reçoit ce que le plan
 * cite après chaque geste : fichier ET découpe, la découpe n'étant PAS un
 * champ repris du disque à l'enregistrement (`champs-du-serveur.ts`) — sans
 * la recopier dans la fiche locale, la prochaine frappe réécrirait l'ancienne
 * découpe par-dessus celle de la prise qu'on vient de choisir.
 */
export function usePrises(filmId: string, planId: string, version: number, onPlanChange: (plan: CeQueCiteLePlan) => void) {
  const [prises, setPrises] = useState<Prise[] | null>(null);
  const [enCours, setEnCours] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const base = `/api/motion/film/${filmId}/cinema/plans/${encodeURIComponent(planId)}/prises`;

  const recharger = useCallback(async () => {
    const reponse = await fetch(base, { cache: "no-store" });
    const corps = (await reponse.json().catch(() => ({}))) as { prises?: Prise[]; erreur?: string };
    if (!reponse.ok || !corps.prises) {
      setErreur(corps.erreur ?? "Les prises n'ont pas pu être lues.");
      return;
    }
    setErreur(null);
    setPrises(corps.prises);
  }, [base]);

  useEffect(() => void recharger(), [recharger, version]);

  const agir = useCallback(
    async (n: number, methode: "POST" | "DELETE") => {
      setEnCours(n);
      try {
        const reponse = await fetch(`${base}/${n}`, { method: methode });
        const corps = (await reponse.json().catch(() => ({}))) as { prises?: Prise[]; plan?: CeQueCiteLePlan; erreur?: string };
        if (!reponse.ok || !corps.prises) {
          setErreur(corps.erreur ?? "Échec.");
          return;
        }
        setErreur(null);
        setPrises(corps.prises);
        if (corps.plan) onPlanChange(corps.plan);
      } catch {
        setErreur("GEN MOTION ne répond pas.");
      } finally {
        setEnCours(null);
      }
    },
    [base, onPlanChange],
  );

  return { prises, erreur, enCours, retenir: (n: number) => agir(n, "POST"), supprimer: (n: number) => agir(n, "DELETE") };
}
