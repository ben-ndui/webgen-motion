import { useCallback, useEffect, useState } from "react";
import type { PointerEvent as PointeurReact } from "react";

import { CLE_DE_LA_FLOTTANTE, enregistrer, lire } from "./reglages-de-la-console";

export type Cadre = { x: number; y: number; w: number; h: number };

// x ou y à -1 : pas encore déplacée, elle se pose en bas à droite.
const CADRE_PAR_DEFAUT: Cadre = { x: -1, y: -1, w: 520, h: 640 };

/** Suit le pointeur jusqu'au relâchement, puis rend la main. */
function suivreLePointeur(bouger: (ev: PointerEvent) => void, relacher: () => void): void {
  const fin = () => {
    relacher();
    window.removeEventListener("pointermove", bouger);
    window.removeEventListener("pointerup", fin);
  };
  window.addEventListener("pointermove", bouger);
  window.addEventListener("pointerup", fin);
}

/** Position et taille de la console flottante, déplaçable par son titre et retenue d'une visite à l'autre. */
export function useConsoleFlottante() {
  const [cadre, setCadre] = useState<Cadre>(CADRE_PAR_DEFAUT);
  const [deplacement, setDeplacement] = useState(false);

  useEffect(() => {
    const image = requestAnimationFrame(() => {
      try {
        const enregistre = JSON.parse(lire(CLE_DE_LA_FLOTTANTE) ?? "null") as Cadre | null;
        if (enregistre && typeof enregistre.w === "number") setCadre(enregistre);
      } catch {}
    });
    return () => cancelAnimationFrame(image);
  }, []);

  /** Le cadre ramené dans la fenêtre (elle a pu rétrécir depuis). */
  const cadreVisible = useCallback((): Cadre => {
    if (typeof window === "undefined") return { x: 0, y: 0, w: CADRE_PAR_DEFAUT.w, h: CADRE_PAR_DEFAUT.h };
    const largeur = window.innerWidth;
    const hauteur = window.innerHeight;
    const w = Math.min(cadre.w, largeur - 24);
    const h = Math.min(cadre.h, hauteur - 24);
    const x = cadre.x < 0 ? largeur - w - 24 : Math.min(Math.max(0, cadre.x), largeur - 60);
    const y = cadre.y < 0 ? hauteur - h - 24 : Math.min(Math.max(0, cadre.y), hauteur - 48);
    return { x, y, w, h };
  }, [cadre]);

  const retenir = (suivant: Cadre) => {
    setCadre(suivant);
    enregistrer(CLE_DE_LA_FLOTTANTE, JSON.stringify(suivant));
  };

  const deplacer = (e: PointeurReact) => {
    if ((e.target as HTMLElement).closest("button")) return; // les boutons du titre gardent leur clic
    e.preventDefault();
    setDeplacement(true);
    const depart = cadreVisible();
    let dernier = depart;
    suivreLePointeur(
      (ev) => {
        dernier = {
          ...depart,
          x: Math.min(Math.max(0, depart.x + ev.clientX - e.clientX), window.innerWidth - 60),
          y: Math.min(Math.max(0, depart.y + ev.clientY - e.clientY), window.innerHeight - 48),
        };
        setCadre(dernier);
      },
      () => {
        setDeplacement(false);
        retenir(dernier);
      },
    );
  };

  const redimensionner = (e: PointeurReact) => {
    e.preventDefault();
    const depart = cadreVisible();
    let dernier = depart;
    suivreLePointeur(
      (ev) => {
        dernier = {
          ...depart,
          w: Math.min(Math.max(380, depart.w + ev.clientX - e.clientX), window.innerWidth - depart.x),
          h: Math.min(Math.max(320, depart.h + ev.clientY - e.clientY), window.innerHeight - depart.y),
        };
        setCadre(dernier);
      },
      () => retenir(dernier),
    );
  };

  return { cadreVisible, deplacement, deplacer, redimensionner };
}
