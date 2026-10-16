import { useCallback, useEffect, useRef, useState } from "react";

import { CLE_DU_MODE, type ModeDeLaConsole, enregistrer, modeEnregistre } from "./reglages-de-la-console";

/**
 * Où vit la console (fermée, feuille, flottante, fenêtre), retenu d'une visite
 * à l'autre, avec ⌘J pour l'ouvrir ou la refermer et Échap pour refermer la
 * feuille. Le mode « fenetre » se réhydrate ailleurs : seule la fenêtre
 * détachée peut dire si elle est encore ouverte.
 */
export function useModeDeLaConsole(focaliserLaSaisie: () => void) {
  const [mode, setMode] = useState<ModeDeLaConsole>("fermee");
  const [nonLu, setNonLu] = useState(false);
  const [avis, setAvis] = useState<string | null>(null);
  const modeActuel = useRef(mode);
  const dernierModeOuvert = useRef<"feuille" | "flottante">("feuille");

  useEffect(() => {
    modeActuel.current = mode;
    if (mode === "feuille" || mode === "flottante") dernierModeOuvert.current = mode;
  }, [mode]);

  const changerDeMode = useCallback((suivant: ModeDeLaConsole) => {
    setMode(suivant);
    if (suivant !== "fermee") setNonLu(false);
    enregistrer(CLE_DU_MODE, suivant);
  }, []);

  const ouvrir = useCallback(() => {
    changerDeMode(dernierModeOuvert.current);
    focaliserLaSaisie();
  }, [changerDeMode, focaliserLaSaisie]);

  const signaler = useCallback((texte: string) => {
    setAvis(texte);
    window.setTimeout(() => setAvis(null), 4000);
  }, []);

  // Une réponse arrive console fermée : la pastille de l'onglet le dit.
  const noterUneActivite = useCallback(() => {
    if (modeActuel.current === "fermee") setNonLu(true);
  }, []);

  // Après le montage seulement : le HTML servi ne connaît pas le stockage du navigateur.
  useEffect(() => {
    const image = requestAnimationFrame(() => {
      const enregistre = modeEnregistre();
      if (enregistre === "feuille" || enregistre === "flottante") setMode(enregistre);
    });
    return () => cancelAnimationFrame(image);
  }, []);

  useEffect(() => {
    const auClavier = (e: KeyboardEvent) => {
      const actuel = modeActuel.current;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        if (actuel === "fenetre") return; // la console vit dans sa fenêtre
        if (actuel === "fermee") ouvrir();
        else changerDeMode("fermee");
        return;
      }
      // Quand la saisie a un brouillon, Échap l'efface et s'arrête là : il n'arrive pas ici.
      if (e.key === "Escape" && actuel === "feuille") changerDeMode("fermee");
    };
    window.addEventListener("keydown", auClavier);
    return () => window.removeEventListener("keydown", auClavier);
  }, [ouvrir, changerDeMode]);

  return { mode, changerDeMode, ouvrir, nonLu, avis, signaler, noterUneActivite };
}
