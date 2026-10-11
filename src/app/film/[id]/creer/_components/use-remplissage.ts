"use client";

import { useCallback, useRef, useState } from "react";

export type ResumeDuRemplissage = {
  captures: number;
  capturesGardees: number;
  videos: number;
  moments: number;
  logo: boolean;
  redaction: string;
  textesProposes: number;
  aEcrire: string[];
  suggestionsEnAttente: number;
  marque: string[];
};

export type EtatDuRemplissage =
  | { type: "repos" }
  | { type: "en-cours"; etapes: string[] }
  | { type: "fait"; resume: ResumeDuRemplissage }
  | { type: "erreur"; message: string };

/** Lance « Remplir depuis mon site » et suit sa progression (NDJSON). */
export function useRemplissage(id: string, onFini: () => Promise<void>) {
  const [etat, setEtat] = useState<EtatDuRemplissage>({ type: "repos" });
  const arret = useRef<AbortController | null>(null);

  const lancer = useCallback(
    async (url: string, remplacerCaptures = false) => {
      const controleur = new AbortController();
      arret.current = controleur;
      const etapes: string[] = [];
      setEtat({ type: "en-cours", etapes: [] });
      let final: EtatDuRemplissage = { type: "erreur", message: "La lecture du site s'est arrêtée sans résultat." };
      try {
        const reponse = await fetch(`/api/motion/film/${id}/remplir`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, remplacerCaptures }),
          signal: controleur.signal,
        });
        if (!reponse.ok || !reponse.body) {
          const corps = (await reponse.json().catch(() => ({}))) as { erreur?: string };
          setEtat({ type: "erreur", message: corps.erreur ?? "Lancement impossible." });
          return;
        }
        const lecteur = reponse.body.getReader();
        const decodeur = new TextDecoder();
        let reste = "";
        for (;;) {
          const { done, value } = await lecteur.read();
          if (done) break;
          reste += decodeur.decode(value, { stream: true });
          const lignes = reste.split("\n");
          reste = lignes.pop() ?? "";
          for (const ligne of lignes) {
            if (!ligne.trim()) continue;
            const evenement = JSON.parse(ligne) as { type: string; label?: string; message?: string; resume?: ResumeDuRemplissage };
            if (evenement.type === "phase" && evenement.label) {
              etapes.push(evenement.label);
              setEtat({ type: "en-cours", etapes: [...etapes] });
            }
            if (evenement.type === "done" && evenement.resume) final = { type: "fait", resume: evenement.resume };
            if (evenement.type === "error") final = { type: "erreur", message: evenement.message ?? "Erreur inconnue." };
          }
        }
      } catch {
        final = controleur.signal.aborted ? { type: "erreur", message: "Arrêté." } : { type: "erreur", message: "GEN MOTION ne répond pas." };
      }
      // La fiche a pu changer même sur une erreur tardive : on la relit toujours.
      await onFini();
      setEtat(final);
    },
    [id, onFini],
  );

  const arreter = useCallback(() => arret.current?.abort(), []);
  return { etat, lancer, arreter };
}
