import { type ReactNode, useCallback, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Rend ses enfants à la racine de la page du film (`.gm-film`), hors de
 * l'assistant. Pourquoi : `.assistant` est un conteneur de requêtes
 * (`container-type`), et un conteneur devient la référence des éléments
 * `position: fixed` qu'il contient. La fenêtre se posait alors au milieu
 * de l'assistant, et la carte réduite hors de l'écran (16/10/2026).
 */
export default function HorsDuFlux({ children }: { children: ReactNode }) {
  const [cible, setCible] = useState<Element | null>(null);
  const reperer = useCallback((repere: HTMLSpanElement | null) => {
    if (repere) setCible(repere.closest(".gm-film") ?? document.body);
  }, []);
  return (
    <>
      <span ref={reperer} hidden />
      {cible && createPortal(children, cible)}
    </>
  );
}
