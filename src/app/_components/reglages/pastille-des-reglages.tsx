"use client";

import { useCallback, useEffect, useState } from "react";

import { type Reglage, optionnelsAProposer, reglagesManquants } from "@/lib/reglages/etat-des-reglages";

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

// Les modules optionnels (calage mot à mot) : proposés UNE fois pour toujours,
// « Plus tard » suffit à ne plus les voir s'imposer (ils restent dans la fenêtre et les Réglages).
const OPTIONNELS_PROPOSES = "gm-optionnels-proposes";

function optionnelsDejaProposes(): boolean {
  try {
    return localStorage.getItem(OPTIONNELS_PROPOSES) === "1";
  } catch {
    return true;
  }
}

function retenirLesOptionnelsProposes(): void {
  try {
    localStorage.setItem(OPTIONNELS_PROPOSES, "1");
  } catch {
    // stockage bloqué : on ne les reproposera pas d'office (lecture ci-dessus = « déjà proposés »)
  }
}

/**
 * La pastille d'état des réglages, en haut du tableau de bord : « Prêt »
 * seulement si TOUT est réglé (l'ancienne « Configuré » ne regardait que la
 * voix off). S'il manque quelque chose, « Prépare ton studio » s'ouvre une
 * fois par lancement, et la pastille la rouvre. Un module optionnel non installé
 * (calage mot à mot) l'ouvre une seule fois pour toujours, sans compter « à faire ».
 */
export default function PastilleDesReglages({ reglages }: { reglages: Reglage[] }) {
  const manquants = reglagesManquants(reglages).length;
  const optionnels = optionnelsAProposer(reglages).length;
  const [ouverte, setOuverte] = useState(false);
  const fermer = useCallback(() => setOuverte(false), []);

  useEffect(() => {
    const pourLesReglages = manquants > 0 && !dejaProposeCetteFois();
    const pourLesOptionnels = optionnels > 0 && !optionnelsDejaProposes();
    if (!pourLesReglages && !pourLesOptionnels) return;
    retenirQueCEstPropose();
    if (optionnels > 0) retenirLesOptionnelsProposes();
    // Ouverte après le montage : le HTML servi ne connaît pas la session du navigateur.
    const image = requestAnimationFrame(() => setOuverte(true));
    return () => cancelAnimationFrame(image);
  }, [manquants, optionnels]);

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
