"use client";

import { useCallback, useState } from "react";

/**
 * La génération du portrait d'un personnage (quelques secondes, ~0,05 $).
 * Le serveur cite le portrait dans la fiche ; on le pose aussi dans la copie
 * de l'écran pour l'afficher tout de suite (la sauvegarde suivante ne peut
 * de toute façon pas l'effacer : champs-du-serveur.ts).
 */
export type EtatDuPortrait = { etat: "repos" } | { etat: "en-cours" } | { etat: "erreur"; raison: string };

export function usePortraits(filmId: string, avantDeGenerer: () => Promise<boolean>, quandPret: (personnageId: string, portrait: string) => void) {
  const [etats, setEtats] = useState<Record<string, EtatDuPortrait>>({});
  const poser = (personnageId: string, etat: EtatDuPortrait) => setEtats((avant) => ({ ...avant, [personnageId]: etat }));

  const generer = useCallback(
    async (personnageId: string) => {
      poser(personnageId, { etat: "en-cours" });
      if (!(await avantDeGenerer())) {
        poser(personnageId, { etat: "erreur", raison: "Enregistrement impossible : rien n'a été lancé." });
        return;
      }
      try {
        const reponse = await fetch(`/api/motion/film/${filmId}/cinema/personnages/${encodeURIComponent(personnageId)}/portrait`, { method: "POST" });
        const corps = (await reponse.json().catch(() => ({}))) as { portrait?: string; erreur?: string };
        if (!reponse.ok || !corps.portrait) {
          poser(personnageId, { etat: "erreur", raison: corps.erreur ?? "Le portrait n'a pas pu être généré." });
          return;
        }
        quandPret(personnageId, corps.portrait);
        poser(personnageId, { etat: "repos" });
      } catch {
        poser(personnageId, { etat: "erreur", raison: "GEN MOTION ne répond pas." });
      }
    },
    [filmId, avantDeGenerer, quandPret],
  );

  return { etats, generer };
}
