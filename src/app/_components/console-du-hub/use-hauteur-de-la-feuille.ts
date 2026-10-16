import { useEffect, useState } from "react";
import type { PointerEvent as PointeurReact } from "react";

import { CLE_DE_LA_HAUTEUR, enregistrer, lire } from "./reglages-de-la-console";

const HAUTEUR_MINIMALE = 260;
const HAUTEUR_PAR_DEFAUT = 420;

// Les feuilles de la maison ne dépassent pas 85 % de l'écran.
function hauteurMaximale(): number {
  return typeof window === "undefined" ? 800 : Math.round(window.innerHeight * 0.85);
}

function borner(hauteur: number): number {
  return Math.min(hauteurMaximale(), Math.max(HAUTEUR_MINIMALE, hauteur));
}

/** La hauteur de la feuille de la console, tirée par sa poignée et retenue. */
export function useHauteurDeLaFeuille() {
  const [hauteur, setHauteur] = useState(HAUTEUR_PAR_DEFAUT);
  const [tirage, setTirage] = useState(false);

  useEffect(() => {
    const image = requestAnimationFrame(() => {
      const enregistree = parseInt(lire(CLE_DE_LA_HAUTEUR) ?? "", 10);
      if (Number.isFinite(enregistree)) setHauteur(borner(enregistree));
    });
    return () => cancelAnimationFrame(image);
  }, []);

  const tirer = (e: PointeurReact) => {
    e.preventDefault();
    setTirage(true);
    const departY = e.clientY;
    const departHauteur = hauteur;
    // La feuille est posée en bas : tirer vers le haut l'agrandit.
    const suivre = (ev: PointerEvent) => setHauteur(borner(departHauteur + departY - ev.clientY));
    const relacher = (ev: PointerEvent) => {
      setTirage(false);
      enregistrer(CLE_DE_LA_HAUTEUR, String(borner(departHauteur + departY - ev.clientY)));
      window.removeEventListener("pointermove", suivre);
      window.removeEventListener("pointerup", relacher);
    };
    window.addEventListener("pointermove", suivre);
    window.addEventListener("pointerup", relacher);
  };

  return { hauteur, tirage, tirer };
}
