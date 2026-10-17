"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { FicheDeFormat } from "@/lib/formats/catalogue";
import type { Enregistrement } from "../../../../film/[id]/creer/_components/use-fiche-du-film";

export type EtatDuProjet = { projet: FicheDeFormat; erreurs: string[]; aEcrire: string[] };

// Même rythme que l'assistant du film : assez pour finir un mot, assez court pour ne rien perdre.
const DELAI_D_ENREGISTREMENT_MS = 1200;

/**
 * Le projet que l'éditeur modifie, enregistré tout seul après chaque pause de
 * saisie. Le serveur reste la vérité de ce qu'il CALCULE (erreurs, textes à
 * écrire, `exemple`) : on reprend ces trois-là après chaque enregistrement,
 * jamais le projet entier (ce qu'on a tapé pendant l'envoi resterait perdu).
 */
export function useProjetDeFormat(id: string, initial: EtatDuProjet) {
  const [projet, setProjet] = useState(initial.projet);
  const [erreurs, setErreurs] = useState(initial.erreurs);
  const [aEcrire, setAEcrire] = useState(initial.aEcrire);
  const [enregistrement, setEnregistrement] = useState<Enregistrement>("a-jour");
  const projetRef = useRef(projet);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const url = `/api/motion/formats/${encodeURIComponent(id)}`;

  const enregistrer = useCallback(async (): Promise<boolean> => {
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = null;
    setEnregistrement("en-cours");
    try {
      const reponse = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projet: projetRef.current }),
      });
      if (!reponse.ok) throw new Error(String(reponse.status));
      const etat = (await reponse.json()) as EtatDuProjet;
      setErreurs(etat.erreurs);
      setAEcrire(etat.aEcrire);
      setEnregistrement(minuteur.current ? "en-attente" : "a-jour");
      return true;
    } catch {
      setEnregistrement("erreur");
      return false;
    }
  }, [url]);

  /** Modifie une copie du projet, puis programme l'enregistrement. */
  const modifier = useCallback(
    (changement: (copie: FicheDeFormat) => FicheDeFormat | void) => {
      const copie = structuredClone(projetRef.current);
      const resultat = changement(copie) ?? copie;
      projetRef.current = resultat;
      setProjet(resultat);
      setEnregistrement("en-attente");
      if (minuteur.current) clearTimeout(minuteur.current);
      minuteur.current = setTimeout(() => void enregistrer(), DELAI_D_ENREGISTREMENT_MS);
    },
    [enregistrer],
  );

  /**
   * Après un dépôt, le SERVEUR a réécrit le projet (fichier, tempo mesuré) :
   * on enregistre d'abord ce qui attend, puis on reprend du serveur les seuls
   * champs que `prendre` désigne. Sans ça, l'enregistrement suivant renvoyait
   * l'ancienne copie et effaçait en silence ce que le serveur venait de mesurer.
   */
  const reprendreDuServeur = useCallback(
    async (prendre: (local: FicheDeFormat, serveur: FicheDeFormat) => FicheDeFormat): Promise<boolean> => {
      if (enregistrement !== "a-jour" && !(await enregistrer())) return false;
      const reponse = await fetch(url, { cache: "no-store" });
      if (!reponse.ok) return false;
      const etat = (await reponse.json()) as EtatDuProjet;
      const fusion = prendre(structuredClone(projetRef.current), etat.projet);
      projetRef.current = fusion;
      setProjet(fusion);
      setErreurs(etat.erreurs);
      setAEcrire(etat.aEcrire);
      return true;
    },
    [url, enregistrement, enregistrer],
  );

  // On quitte l'éditeur (« Retour au projet ») avec une saisie programmée : on l'envoie TOUT DE
  // SUITE (keepalive survit à la navigation), au lieu de la perdre ou de la laisser partir plus tard.
  useEffect(
    () => () => {
      if (!minuteur.current) return;
      clearTimeout(minuteur.current);
      minuteur.current = null;
      void fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projet: projetRef.current }),
        keepalive: true,
      }).catch(() => {});
    },
    [url],
  );

  // Quitter la page avec une saisie pas encore partie : on prévient.
  useEffect(() => {
    const avant = (evenement: BeforeUnloadEvent) => {
      if (enregistrement === "en-attente" || enregistrement === "en-cours") evenement.preventDefault();
    };
    window.addEventListener("beforeunload", avant);
    return () => window.removeEventListener("beforeunload", avant);
  }, [enregistrement]);

  return { projet, erreurs, aEcrire, enregistrement, modifier, enregistrer, reprendreDuServeur };
}
