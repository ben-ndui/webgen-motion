"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { EtatDeLEditeur } from "@/lib/film-editeur";
import type { FilmSpec } from "../../../../../../remotion/film/spec";

export type Enregistrement = "a-jour" | "en-attente" | "en-cours" | "erreur";
export type RoleDeDepot = "capture" | "musique" | "logo";

// Assez pour finir un mot avant d'écrire, assez court pour ne rien perdre.
const DELAI_D_ENREGISTREMENT_MS = 1200;

/**
 * La fiche que l'assistant modifie, enregistrée toute seule après chaque
 * pause de saisie. Le serveur reste la vérité pour ce qu'il CALCULE (médias
 * présents, textes encore à écrire, musique mesurée, logo mesuré) : on le
 * relit après chaque enregistrement et chaque dépôt.
 */
export function useFicheDuFilm(etatInitial: EtatDeLEditeur) {
  const [etat, setEtat] = useState(etatInitial);
  const [fiche, setFiche] = useState<FilmSpec>(etatInitial.fiche);
  const [enregistrement, setEnregistrement] = useState<Enregistrement>("a-jour");
  const ficheRef = useRef(fiche);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const url = `/api/motion/film/${etatInitial.id}`;

  const relire = useCallback(async (): Promise<EtatDeLEditeur | null> => {
    const reponse = await fetch(url, { cache: "no-store" });
    if (!reponse.ok) return null;
    const nouveau = (await reponse.json()) as EtatDeLEditeur;
    setEtat(nouveau);
    return nouveau;
  }, [url]);

  const enregistrer = useCallback(async (): Promise<boolean> => {
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = null;
    setEnregistrement("en-cours");
    try {
      const reponse = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fiche: ficheRef.current }),
      });
      if (!reponse.ok) throw new Error(String(reponse.status));
      await relire();
      setEnregistrement("a-jour");
      return true;
    } catch {
      setEnregistrement("erreur");
      return false;
    }
  }, [url, relire]);

  /** Modifie une copie de la fiche, puis programme l'enregistrement. */
  const modifier = useCallback(
    (changement: (copie: FilmSpec) => void) => {
      const copie = structuredClone(ficheRef.current);
      changement(copie);
      ficheRef.current = copie;
      setFiche(copie);
      setEnregistrement("en-attente");
      if (minuteur.current) clearTimeout(minuteur.current);
      minuteur.current = setTimeout(() => void enregistrer(), DELAI_D_ENREGISTREMENT_MS);
    },
    [enregistrer],
  );

  /**
   * Dépose un fichier. On enregistre d'abord ce qui est en attente : le
   * serveur réécrit la fiche pour la musique et le logo, et relire sa
   * version ne doit pas effacer ce qu'on venait de taper.
   */
  const deposer = useCallback(
    async (role: RoleDeDepot, fichier: File, relatif?: string): Promise<string | null> => {
      if (enregistrement !== "a-jour" && !(await enregistrer())) return "Enregistrement impossible, réessaie.";
      const formulaire = new FormData();
      formulaire.set("role", role);
      formulaire.set("fichier", fichier);
      if (relatif) formulaire.set("relatif", relatif);
      try {
        const reponse = await fetch(`${url}/media`, { method: "POST", body: formulaire });
        const corps = (await reponse.json().catch(() => ({}))) as { erreur?: string };
        if (!reponse.ok) return corps.erreur ?? "Le dépôt a échoué.";
      } catch {
        return "GEN MOTION ne répond pas.";
      }
      const nouveau = await relire();
      // On ne reprend du serveur QUE ce que le dépôt a calculé : ce qu'on a
      // tapé pendant l'envoi reste (relire la fiche entière l'effaçait).
      if (nouveau && role !== "capture") {
        const copie = structuredClone(ficheRef.current);
        if (role === "musique") copie.musique = nouveau.fiche.musique;
        if (role === "logo") copie.marque.logo = nouveau.fiche.marque.logo;
        ficheRef.current = copie;
        setFiche(copie);
      }
      return null;
    },
    [url, enregistrement, enregistrer, relire],
  );

  // Quitter la page avec une saisie pas encore partie : on prévient.
  useEffect(() => {
    const avant = (evenement: BeforeUnloadEvent) => {
      if (enregistrement === "en-attente" || enregistrement === "en-cours") evenement.preventDefault();
    };
    window.addEventListener("beforeunload", avant);
    return () => window.removeEventListener("beforeunload", avant);
  }, [enregistrement]);

  return { etat, fiche, enregistrement, modifier, enregistrer, deposer };
}
