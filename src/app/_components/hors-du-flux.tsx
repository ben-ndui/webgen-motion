import { type ReactNode, useCallback, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Rend ses enfants hors du flux de la page : dans l'ancêtre `racine` le plus
 * proche (un sélecteur), sinon dans <body>.
 *
 * Pourquoi : un ancêtre avec `container-type`, `backdrop-filter`,
 * `transform` ou `filter` devient la référence des éléments
 * `position: fixed` qu'il contient. Une fenêtre se posait alors dans
 * l'assistant du film (conteneur de requêtes), ou coupée dans la barre du
 * haut du tableau de bord (flou d'arrière-plan) au lieu de couvrir l'écran
 * (16/10/2026).
 */
export default function HorsDuFlux({ racine, children }: { racine?: string; children: ReactNode }) {
  const [cible, setCible] = useState<Element | null>(null);
  const reperer = useCallback(
    (repere: HTMLSpanElement | null) => {
      if (repere) setCible((racine && repere.closest(racine)) || document.body);
    },
    [racine],
  );
  return (
    <>
      <span ref={reperer} hidden />
      {cible && createPortal(children, cible)}
    </>
  );
}
