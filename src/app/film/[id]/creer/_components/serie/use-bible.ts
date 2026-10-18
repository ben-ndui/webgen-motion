"use client";

import { useCallback, useEffect, useState } from "react";

import type { FicheVisuelle, ReferenceDeLaSerie, VueDeReference } from "@/lib/cinema/bible/etat";

export type ReferenceAffichee = ReferenceDeLaSerie & { fiche: FicheVisuelle };
export type EtatDeLaVue = { etat: "repos" } | { etat: "en-cours" } | { etat: "erreur"; raison: string };

/**
 * La bible visuelle de la série : ses références (lues une fois, puis après
 * chaque geste) et l'état de chaque vue en cours de génération/import.
 */
export function useBible(filmId: string, avantDeGenerer: () => Promise<boolean>) {
  const [references, setReferences] = useState<ReferenceAffichee[] | null>(null);
  const [etats, setEtats] = useState<Record<string, EtatDeLaVue>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const poser = (cle: string, etat: EtatDeLaVue) => setEtats((avant) => ({ ...avant, [cle]: etat }));

  const recharger = useCallback(async () => {
    const reponse = await fetch(`/api/motion/film/${filmId}/cinema/bible`, { cache: "no-store" });
    const corps = (await reponse.json().catch(() => ({}))) as { references?: ReferenceAffichee[]; erreur?: string };
    if (!reponse.ok || !corps.references) {
      setErreur(corps.erreur ?? "La bible n'a pas pu être lue.");
      return;
    }
    setErreur(null);
    setReferences(corps.references);
  }, [filmId]);

  // Juste commencée, la série n'existe encore QUE dans la copie locale : la
  // lisant tout de suite, le serveur ne la connaît pas encore (enregistrement
  // débattu à 1200 ms) et répond « pas de série ». On force l'enregistrement
  // AVANT la première lecture, comme avant une génération.
  useEffect(() => {
    void (async () => {
      await avantDeGenerer();
      await recharger();
    })();
  }, [recharger, avantDeGenerer]);

  const appeler = useCallback(
    async (cle: string, chemin: string, options?: RequestInit) => {
      poser(cle, { etat: "en-cours" });
      try {
        const reponse = await fetch(`/api/motion/film/${filmId}/cinema/bible/${chemin}`, { method: "POST", ...options });
        const corps = (await reponse.json().catch(() => ({}))) as { erreur?: string };
        if (!reponse.ok) {
          poser(cle, { etat: "erreur", raison: corps.erreur ?? "Échec." });
          return false;
        }
        await recharger();
        poser(cle, { etat: "repos" });
        return true;
      } catch {
        poser(cle, { etat: "erreur", raison: "GEN MOTION ne répond pas." });
        return false;
      }
    },
    [filmId, recharger],
  );

  const generer = useCallback(
    async (referenceId: string, vue: VueDeReference) => {
      const cle = `${referenceId}/${vue}`;
      if (!(await avantDeGenerer())) return poser(cle, { etat: "erreur", raison: "Enregistrement impossible : rien n'a été lancé." });
      await appeler(cle, `${encodeURIComponent(referenceId)}/${vue}`);
    },
    [appeler, avantDeGenerer],
  );

  const importer = useCallback(
    async (referenceId: string, vue: VueDeReference, fichier: File, droitsDeclares: boolean) => {
      const donnees = new FormData();
      donnees.set("fichier", fichier);
      donnees.set("droits", droitsDeclares ? "oui" : "non");
      await appeler(`${referenceId}/${vue}`, `${encodeURIComponent(referenceId)}/${vue}/import`, { body: donnees });
    },
    [appeler],
  );

  const retenir = useCallback(
    (referenceId: string, vue: VueDeReference, n: number) =>
      appeler(`${referenceId}/${vue}`, `${encodeURIComponent(referenceId)}/${vue}/retenir`, { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ n }) }),
    [appeler],
  );

  const choisirPrincipale = useCallback(
    (referenceId: string, vue: VueDeReference) =>
      appeler(referenceId, `${encodeURIComponent(referenceId)}/principale`, { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vue }) }),
    [appeler],
  );

  const valider = useCallback((referenceId: string) => appeler(referenceId, `${encodeURIComponent(referenceId)}/valider`), [appeler]);

  const deverrouiller = useCallback(
    (referenceId: string, motif: string) =>
      appeler(referenceId, `${encodeURIComponent(referenceId)}/deverrouiller`, { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ motif }) }),
    [appeler],
  );

  return { references, erreur, etats, generer, importer, retenir, choisirPrincipale, valider, deverrouiller };
}
