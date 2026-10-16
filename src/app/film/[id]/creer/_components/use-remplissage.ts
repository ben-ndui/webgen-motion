"use client";

import { useCallback, useRef, useState } from "react";

import { AVANCEMENT_DE_DEPART, type Avancement, avancer } from "@/lib/site/etapes-du-remplissage";

import { lireLeFlux } from "./lire-le-flux";

export type ResumeDuRemplissage = {
  captures: number;
  capturesGardees: number;
  videos: number;
  moments: number;
  logo: boolean;
  redaction: string;
  // Ce qui a été fait pour la série (épisode proposé, ou pourquoi rien).
  serie?: string;
  textesProposes: number;
  aEcrire: string[];
  suggestionsEnAttente: number;
  marque: string[];
};

// L'avancement reste après la fin : le récap montre les captures, l'erreur dit à quelle étape.
export type EtatDuRemplissage =
  | { type: "repos" }
  | { type: "en-cours"; avancement: Avancement }
  | { type: "fait"; resume: ResumeDuRemplissage; avancement: Avancement }
  | { type: "erreur"; message: string; avancement: Avancement };

/** Lance « Remplir depuis mon site » et suit sa progression (NDJSON). */
export function useRemplissage(id: string, onFini: () => Promise<void>) {
  const [etat, setEtat] = useState<EtatDuRemplissage>({ type: "repos" });
  const arret = useRef<AbortController | null>(null);

  const lancer = useCallback(
    async (url: string, remplacerCaptures = false) => {
      const controleur = new AbortController();
      arret.current = controleur;
      let avancement = AVANCEMENT_DE_DEPART;
      setEtat({ type: "en-cours", avancement });
      let resume: ResumeDuRemplissage | null = null;
      let message = "La lecture du site s'est arrêtée sans résultat.";
      try {
        const reponse = await fetch(`/api/motion/film/${id}/remplir`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, remplacerCaptures }),
          signal: controleur.signal,
        });
        if (!reponse.ok || !reponse.body) {
          const corps = (await reponse.json().catch(() => ({}))) as { erreur?: string };
          setEtat({ type: "erreur", message: corps.erreur ?? "Lancement impossible.", avancement });
          return;
        }
        await lireLeFlux(reponse, (brut) => {
          const evenement = brut as { type: string; message?: string; resume?: ResumeDuRemplissage };
          const suivant = avancer(avancement, evenement);
          if (suivant !== avancement) {
            avancement = suivant;
            setEtat({ type: "en-cours", avancement });
          }
          if (evenement.type === "done" && evenement.resume) resume = evenement.resume;
          if (evenement.type === "error") message = evenement.message ?? "Erreur inconnue.";
        });
      } catch {
        resume = null;
        message = controleur.signal.aborted ? "Arrêté à ta demande." : "GEN MOTION ne répond pas.";
      }
      // La fiche a pu changer même sur une erreur tardive : on la relit toujours.
      await onFini();
      setEtat(resume ? { type: "fait", resume, avancement } : { type: "erreur", message, avancement });
    },
    [id, onFini],
  );

  const arreter = useCallback(() => arret.current?.abort(), []);
  return { etat, lancer, arreter };
}
