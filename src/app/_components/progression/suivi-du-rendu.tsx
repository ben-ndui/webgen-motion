"use client";

import { useEffect, useState } from "react";

import { ETAPES_DU_RENDU, NOMS_DES_ETAPES, type EtapeDuRendu, direLeTempsRestant, direUneDuree } from "@/lib/suivi-du-rendu";
import type { EtatDuRendu } from "@/lib/use-rendu-en-flux";

import BarreDeProgression from "./barre-de-progression";
import "./progression.css";

type EnCours = Extract<EtatDuRendu, { type: "en-cours" }>;

/** Où en est l'étape : une fraction (images, encodage), ou null quand on ne peut pas le chiffrer. */
function avancementDeLEtape(etat: EnCours): number | null {
  if (etat.etape !== "images" && etat.etape !== "encodage") return null;
  return etat.total > 0 ? etat.frames / etat.total : null;
}

/** Les secondes écoulées depuis `debut`, mises à jour chaque seconde. */
function useSecondesDepuis(debut: number): number {
  const [maintenant, setMaintenant] = useState(() => Date.now());
  useEffect(() => {
    const minuterie = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => clearInterval(minuterie);
  }, []);
  return Math.max(0, Math.floor((maintenant - debut) / 1000));
}

function direLEcoule(secondes: number): string {
  if (secondes === 0) return "Démarrage…";
  return `${direUneDuree(secondes)} ${secondes === 1 ? "écoulée" : "écoulées"}`;
}

function etatDeLEtape(etape: EtapeDuRendu, active: EtapeDuRendu | undefined): "faite" | "active" | "a-venir" {
  if (!active) return "a-venir";
  const ecart = ETAPES_DU_RENDU.indexOf(etape) - ETAPES_DU_RENDU.indexOf(active);
  return ecart < 0 ? "faite" : ecart === 0 ? "active" : "a-venir";
}

/**
 * Le suivi d'un rendu en cours : les quatre étapes (Préparation › Images ›
 * Encodage › Finalisation), ce qui se passe en mots, le temps restant estimé
 * par Remotion, la barre, puis le temps écoulé et la durée estimée des images
 * (écoulé + restant ; l'encodage s'y ajoute). Un flux sans étapes (l'écoute des paroles) n'a que le
 * libellé, la barre et le temps écoulé.
 */
export default function SuiviDuRendu({ etat }: { etat: EnCours }) {
  const ecoule = useSecondesDepuis(etat.debut);
  const avancement = avancementDeLEtape(etat);
  const aDroite = etat.restant !== null && etat.restant > 0
    ? direLeTempsRestant(etat.restant)
    : avancement !== null ? `${Math.round(avancement * 100)} %` : null;
  return (
    <div className="suivi-du-rendu" data-wm-id="rendu.suivi">
      {/* Seule l'étape est annoncée aux lecteurs d'écran : le reste change chaque seconde. */}
      <span className="sr-only" role="status">{etat.etape ? `Rendu : ${NOMS_DES_ETAPES[etat.etape]}` : etat.label}</span>
      {etat.etape && (
        <ol className="suivi-etapes" aria-label="Étapes du rendu">
          {ETAPES_DU_RENDU.map((etape) => {
            const etatDeCelleCi = etatDeLEtape(etape, etat.etape);
            return (
              <li key={etape} className="suivi-etape" data-etat={etatDeCelleCi} aria-current={etatDeCelleCi === "active" ? "step" : undefined}>
                <span className="suivi-etape-point" aria-hidden />
                {NOMS_DES_ETAPES[etape]}
              </li>
            );
          })}
        </ol>
      )}
      <div className="suivi-ligne">
        <span className="suivi-libelle">{etat.label}</span>
        {aDroite && <span className="suivi-restant">{aDroite}</span>}
      </div>
      <BarreDeProgression valeur={avancement} nom="Progression du rendu" />
      <p className="suivi-duree" aria-hidden>
        {direLEcoule(ecoule)}
        {/* Remotion n'estime que les images : l'encodage vient en plus, on le dit. */}
        {etat.restant !== null && etat.restant > 0 && ` · durée estimée ~${direUneDuree(ecoule + etat.restant)} + encodage`}
      </p>
    </div>
  );
}
