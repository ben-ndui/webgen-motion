"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { Budget, EtatDuPlan } from "@/lib/cinema/generation";

/**
 * L'état de chaque plan de la série, tel que le SERVEUR le connaît (prêt sur
 * le disque, en cours chez Google, refusé). Un seul endroit interroge : à
 * l'ouverture, puis toutes les 6 s tant qu'un plan est en cours. Chaque appel
 * GET fait UN pas de suivi côté serveur (et télécharge la vidéo quand elle
 * est prête).
 */
export type SuiviDUnPlan = EtatDuPlan | { etat: "chargement" } | { etat: "erreur"; raison: string };

export const INTERVALLE_DE_SUIVI_MS = 6000;

type ReponseDuServeur = { plan?: EtatDuPlan; budget?: Budget; erreur?: string };

export function useSuiviDesPlans(filmId: string, planIds: string[], avantDeGenerer: () => Promise<boolean>) {
  const [suivis, setSuivis] = useState<Record<string, SuiviDUnPlan>>({});
  const [budget, setBudget] = useState<Budget | null>(null);
  const [blocage, setBlocage] = useState<string | null>(null);
  const cle = planIds.join("|");
  // Les plans déjà demandés au serveur : chacun n'est lu qu'une fois à l'ouverture.
  const demandes = useRef(new Set<string>());

  const lire = useCallback(
    async (planId: string, methode: "GET" | "POST") => {
      const url = `/api/motion/film/${filmId}/cinema/plans/${encodeURIComponent(planId)}`;
      let reponse: Response;
      try {
        reponse = await fetch(url, { method: methode, cache: "no-store" });
      } catch {
        setSuivis((avant) => ({ ...avant, [planId]: { etat: "erreur", raison: "GEN MOTION ne répond pas." } }));
        return;
      }
      const corps = (await reponse.json().catch(() => ({}))) as ReponseDuServeur;
      if (corps.budget) setBudget(corps.budget);
      // Studio absent ou clé manquante : c'est toute la série qui est bloquée, on le dit une fois en haut.
      if (reponse.status === 403 || reponse.status === 412) setBlocage(corps.erreur ?? "Génération indisponible.");
      // Un plan tout juste ajouté n'est pas encore enregistré : le serveur ne le
      // connaît pas. Pour l'écran, il est simplement « pas encore généré ».
      if (reponse.status === 404 && methode === "GET") {
        setSuivis((avant) => ({ ...avant, [planId]: { etat: "vide" } }));
        return;
      }
      if (!reponse.ok || !corps.plan) {
        setSuivis((avant) => ({ ...avant, [planId]: { etat: "erreur", raison: corps.erreur ?? "Réponse illisible." } }));
        return;
      }
      setSuivis((avant) => ({ ...avant, [planId]: corps.plan! }));
    },
    [filmId],
  );

  // À l'ouverture et quand la liste des plans change : l'état de chacun.
  useEffect(() => {
    for (const planId of cle.split("|").filter(Boolean)) {
      if (demandes.current.has(planId)) continue;
      demandes.current.add(planId);
      void lire(planId, "GET");
    }
  }, [cle, lire]);

  // Tant qu'un plan est en cours chez Google, on repasse le voir.
  const enCours = Object.entries(suivis).filter(([, suivi]) => suivi.etat === "en-cours").map(([planId]) => planId);
  const cleEnCours = enCours.join("|");
  useEffect(() => {
    if (!cleEnCours) return;
    const minuteur = setInterval(() => {
      for (const planId of cleEnCours.split("|")) void lire(planId, "GET");
    }, INTERVALLE_DE_SUIVI_MS);
    return () => clearInterval(minuteur);
  }, [cleEnCours, lire]);

  /** Enregistre d'abord la fiche (le serveur doit voir la consigne tapée), puis lance. */
  const generer = useCallback(
    async (planId: string) => {
      setSuivis((avant) => ({ ...avant, [planId]: { etat: "chargement" } }));
      if (!(await avantDeGenerer())) {
        setSuivis((avant) => ({ ...avant, [planId]: { etat: "erreur", raison: "Enregistrement impossible : rien n'a été lancé." } }));
        return;
      }
      await lire(planId, "POST");
    },
    [avantDeGenerer, lire],
  );

  return { suivis, budget, blocage, generer };
}
