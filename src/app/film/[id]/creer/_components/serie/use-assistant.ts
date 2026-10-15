"use client";

import { useState } from "react";

import { appliquerLaProposition } from "@/lib/cinema/assistant/appliquer";
import { type DemandeALAssistant, type Proposition, textesDe } from "@/lib/cinema/assistant/types";
import type { CinemaDuFilm } from "../../../../../../../remotion/film/cinema/types";

export type EtatDeLAssistant =
  | { type: "repos" }
  | { type: "en-cours"; demande: DemandeALAssistant }
  | { type: "proposition"; demande: DemandeALAssistant; proposition: Proposition }
  | { type: "erreur"; raison: string };

/**
 * Un geste de l'assistant : demander à Claude, montrer sa proposition, la
 * garder ou non. Claude lit la série TELLE QU'ELLE EST À L'ÉCRAN (rien n'est
 * enregistré avant) ; « Garder » la pose sur la série du moment.
 */
export function useAssistant(filmId: string, cinema: CinemaDuFilm, modifierLaSerie: (changement: (cinema: CinemaDuFilm) => void) => void) {
  const [etat, setEtat] = useState<EtatDeLAssistant>({ type: "repos" });

  const demander = async (demande: DemandeALAssistant) => {
    setEtat({ type: "en-cours", demande });
    try {
      const reponse = await fetch(`/api/motion/film/${encodeURIComponent(filmId)}/cinema/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cinema, demande }),
      });
      const corps = (await reponse.json().catch(() => ({}))) as { proposition?: Proposition; erreur?: string };
      if (!reponse.ok || !corps.proposition) {
        setEtat({ type: "erreur", raison: corps.erreur ?? `Claude n'a pas pu répondre (erreur ${reponse.status}).` });
        return;
      }
      setEtat({ type: "proposition", demande, proposition: corps.proposition });
    } catch (erreur) {
      setEtat({ type: "erreur", raison: `L'assistant n'a pas pu joindre GEN MOTION : ${(erreur as Error).message}` });
    }
  };

  // `apres` reçoit la série modifiée : l'écran s'en sert pour ouvrir ce qui vient d'être ajouté.
  const garder = (apres?: (cinema: CinemaDuFilm) => void) => {
    if (etat.type !== "proposition") return;
    let refus: string | null = null;
    modifierLaSerie((c) => {
      refus = appliquerLaProposition(c, etat.proposition);
      if (!refus) apres?.(c);
    });
    setEtat(refus ? { type: "erreur", raison: refus } : { type: "repos" });
  };

  const refuser = () => setEtat({ type: "repos" });

  // « Autre proposition » : la même demande, en écartant ce qui vient d'être proposé.
  const autre = () => {
    if (etat.type !== "proposition") return;
    void demander({ ...etat.demande, aEviter: [...(etat.demande.aEviter ?? []), ...textesDe(etat.proposition)] });
  };

  return { etat, demander, garder, refuser, autre };
}

/** L'épisode qui contient une scène : Claude lit l'épisode entier. */
export function episodeDeLaScene(cinema: CinemaDuFilm, sceneId: string): string {
  return cinema.episodes.find((e) => e.scenes.some((s) => s.id === sceneId))?.id ?? "";
}
