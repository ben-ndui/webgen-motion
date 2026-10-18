"use client";

import { useState } from "react";

export type EtatDuTelechargement =
  | { type: "repos" }
  | { type: "telechargement"; recus: number; total: number }
  | { type: "termine" }
  // Un autre écran a déjà lancé ce téléchargement (409) : il suit son cours, rien à relancer.
  | { type: "deja-en-cours" }
  | { type: "erreur"; message: string };

type Evenement = { type: string; recus?: number; total?: number; message?: string };

/**
 * Lancer le téléchargement d'un modèle et suivre son flux NDJSON
 * (lib/flux-de-telechargement.ts). Un flux qui se ferme sans « done » ni
 * « error » n'est PAS un succès : il s'affiche comme une erreur.
 */
export function useTelechargementDeModele(adresse: string, total: number, corps?: object) {
  const [etat, setEtat] = useState<EtatDuTelechargement>({ type: "repos" });

  async function telecharger(): Promise<boolean> {
    setEtat({ type: "telechargement", recus: 0, total });
    let conclu: boolean | null = null;
    try {
      const reponse = await fetch(adresse, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corps ?? {}),
      });
      if (reponse.status === 409) {
        setEtat({ type: "deja-en-cours" });
        return false;
      }
      if (!reponse.ok || !reponse.body) {
        const refus = (await reponse.json().catch(() => ({}))) as { error?: string };
        setEtat({ type: "erreur", message: refus.error ?? `Téléchargement refusé (${reponse.status}).` });
        return false;
      }
      const lecteur = reponse.body.getReader();
      const decodeur = new TextDecoder();
      let tampon = "";
      for (;;) {
        const { done, value } = await lecteur.read();
        if (done) break;
        tampon += decodeur.decode(value, { stream: true });
        const lignes = tampon.split("\n");
        tampon = lignes.pop() ?? "";
        for (const ligne of lignes.filter(Boolean)) {
          const evenement = JSON.parse(ligne) as Evenement;
          if (evenement.type === "progress") setEtat({ type: "telechargement", recus: evenement.recus ?? 0, total: evenement.total ?? total });
          if (evenement.type === "error") {
            conclu = false;
            setEtat({ type: "erreur", message: evenement.message ?? "Téléchargement en échec." });
          }
          if (evenement.type === "done") {
            conclu = true;
            setEtat({ type: "termine" });
          }
        }
      }
      if (conclu === null) setEtat({ type: "erreur", message: "Le téléchargement s'est arrêté sans résultat : relance-le." });
      return conclu === true;
    } catch {
      setEtat({ type: "erreur", message: "GEN MOTION ne répond pas : vérifie que l'application est lancée." });
      return false;
    }
  }

  return { etat, telecharger };
}
