"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type EtatDUnFond =
  | { type: "lecture" }
  | { type: "aucun" }
  | { type: "en-cours" }
  // `action` : le décor change du début à la fin, sa boucle sautera à chaque tour.
  | { type: "pret"; video: string; boucle?: "propre" | "action" | "inconnue" }
  | { type: "erreur"; message: string; studio?: boolean };

// Veo met une à trois minutes : on demande toutes les 6 s, comme la série.
const INTERVALLE_DE_SUIVI_MS = 6000;

/**
 * Le décor sur mesure d'UN format (clip 16:9 ou teaser 9:16) : lit son état au
 * chargement, lance sa génération, puis la suit jusqu'à la vidéo prête. Un
 * rechargement reprend la génération en cours (le serveur la connaît), sans la
 * relancer ni la repayer.
 */
export function useFondSurMesure(id: string, version: "long" | "court", avantDeGenerer: () => Promise<boolean>) {
  const [etat, setEtat] = useState<EtatDUnFond>({ type: "lecture" });
  const url = `/api/motion/formats/${encodeURIComponent(id)}/fond`;
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Le prochain pas de suivi passe par une référence : une fonction qui se reprogramme elle-même.
  const suivreRef = useRef<() => Promise<void>>(async () => {});

  // Un pas de suivi. `garder` : la réponse compte-t-elle encore (composant toujours affiché) ?
  const suivre = useCallback(
    (garder: () => boolean = () => true): Promise<void> =>
      fetch(`${url}?version=${version}`, { cache: "no-store" })
        .then(async (reponse) => {
          const corps = (await reponse.json().catch(() => ({}))) as { etat?: string; video?: string; boucle?: "propre" | "action" | "inconnue"; raison?: string; erreur?: string };
          if (!garder()) return;
          if (reponse.status === 403) return setEtat({ type: "erreur", message: "Le décor sur mesure est une fonction Studio.", studio: true });
          if (!reponse.ok) return setEtat({ type: "erreur", message: corps.erreur ?? `Suivi impossible (${reponse.status}).` });
          if (corps.etat === "pret" && corps.video) return setEtat({ type: "pret", video: corps.video, boucle: corps.boucle });
          if (corps.etat === "refuse") {
            return setEtat({ type: "erreur", message: `Google a refusé ce décor : ${corps.raison ?? ""} Rien n'a été facturé. Change la description et relance.` });
          }
          if (corps.etat === "en-cours") {
            setEtat({ type: "en-cours" });
            minuteur.current = setTimeout(() => void suivreRef.current(), INTERVALLE_DE_SUIVI_MS);
            return;
          }
          setEtat({ type: "aucun" });
        })
        .catch(() => {
          if (garder()) setEtat({ type: "erreur", message: "GEN MOTION ne répond pas." });
        }),
    [url, version],
  );

  useEffect(() => {
    suivreRef.current = suivre;
  }, [suivre]);

  useEffect(() => {
    let affiche = true;
    void suivre(() => affiche);
    return () => {
      affiche = false;
      if (minuteur.current) clearTimeout(minuteur.current);
    };
  }, [suivre]);

  const generer = useCallback(async () => {
    if (!(await avantDeGenerer())) return setEtat({ type: "erreur", message: "Enregistrement impossible : réessaie." });
    setEtat({ type: "en-cours" });
    const reponse = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ version }) }).catch(() => null);
    const corps = (await reponse?.json().catch(() => ({}))) as { erreur?: string } | undefined;
    if (!reponse?.ok) return setEtat({ type: "erreur", message: corps?.erreur ?? "La génération n'a pas pu partir.", studio: reponse?.status === 403 });
    minuteur.current = setTimeout(() => void suivreRef.current(), INTERVALLE_DE_SUIVI_MS);
  }, [url, version, avantDeGenerer]);

  return { etat, generer };
}
