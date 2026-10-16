"use client";

import { useCallback, useEffect, useState } from "react";

import { type Reglage, reglagesManquants } from "@/lib/reglages/etat-des-reglages";

import HorsDuFlux from "../hors-du-flux";
import PrepareTonStudio from "./prepare-ton-studio";

// Une fois par lancement : l'app de bureau garde sa session tant qu'elle tourne.
const DEJA_PROPOSE = "gm-reglages-proposes";

function dejaProposeCetteFois(): boolean {
  try {
    return sessionStorage.getItem(DEJA_PROPOSE) === "1";
  } catch {
    return false;
  }
}

function retenirQueCEstPropose(): void {
  try {
    sessionStorage.setItem(DEJA_PROPOSE, "1");
  } catch {
    // stockage bloqué : la fenêtre reviendra au prochain chargement, rien de grave
  }
}

/**
 * La pastille d'état des réglages, en haut du tableau de bord : « Prêt »
 * seulement si TOUT est réglé (l'ancienne « Configuré » ne regardait que la
 * voix off). S'il manque quelque chose, « Prépare ton studio » s'ouvre une
 * fois par lancement, et la pastille la rouvre.
 */
export default function PastilleDesReglages({ reglages }: { reglages: Reglage[] }) {
  const manquants = reglagesManquants(reglages).length;
  const [ouverte, setOuverte] = useState(false);
  const fermer = useCallback(() => setOuverte(false), []);

  useEffect(() => {
    if (manquants === 0 || dejaProposeCetteFois()) return;
    retenirQueCEstPropose();
    // Ouverte après le montage : le HTML servi ne connaît pas la session du navigateur.
    const image = requestAnimationFrame(() => setOuverte(true));
    return () => cancelAnimationFrame(image);
  }, [manquants]);

  return (
    <>
      <button
        type="button"
        className="reglages-chip"
        data-manque={manquants > 0}
        onClick={() => setOuverte(true)}
        data-wm-id="hub.config-chip"
      >
        <span className="reglages-chip-point" aria-hidden />
        {manquants === 0 ? "Prêt" : `${manquants} réglage${manquants > 1 ? "s" : ""} à faire`}
      </button>
      {ouverte && (
        <HorsDuFlux>
          <PrepareTonStudio reglages={reglages} fermer={fermer} />
        </HorsDuFlux>
      )}
    </>
  );
}
