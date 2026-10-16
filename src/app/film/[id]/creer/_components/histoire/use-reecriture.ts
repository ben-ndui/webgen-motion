"use client";

import { useState } from "react";

import type { SectionDeLHistoire } from "@/lib/histoire/sections";
import type { Langue } from "../../../../../../../remotion/film/spec";

export type EtatDeLaReecriture =
  | { type: "repos" }
  | { type: "en-cours" }
  | { type: "proposition"; champs: Record<string, string>; aEcrireSoiMeme: string[] }
  | { type: "erreur"; raison: string };

type Parametres = { id: string; langue: Langue; section: SectionDeLHistoire; avantDeDemander: () => Promise<boolean> };

/**
 * Demander à Claude une section de « Ton histoire », avec une consigne
 * facultative. « Une autre » renvoie la même demande en écartant ce qu'il a
 * déjà proposé (sinon il repropose souvent la même phrase).
 */
export function useReecriture({ id, langue, section, avantDeDemander }: Parametres) {
  const [etat, setEtat] = useState<EtatDeLaReecriture>({ type: "repos" });
  const [aEviter, setAEviter] = useState<string[]>([]);
  const [derniereConsigne, setDerniereConsigne] = useState("");

  async function envoyer(consigne: string, ecartes: string[]) {
    setEtat({ type: "en-cours" });
    setDerniereConsigne(consigne);
    // Claude lit la fiche enregistrée : ce qu'on vient de taper doit y être.
    if (!(await avantDeDemander())) {
      setEtat({ type: "erreur", raison: "Tes textes ne se sont pas enregistrés : rien n'a été demandé à Claude." });
      return;
    }
    try {
      const reponse = await fetch(`/api/motion/film/${encodeURIComponent(id)}/histoire/reecrire`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ langue, section, consigne, aEviter: ecartes }),
      });
      const corps = (await reponse.json().catch(() => ({}))) as { champs?: Record<string, string>; aEcrireSoiMeme?: string[]; erreur?: string };
      if (!reponse.ok || !corps.champs) {
        setEtat({ type: "erreur", raison: corps.erreur ?? `Claude n'a pas pu répondre (erreur ${reponse.status}).` });
        return;
      }
      setEtat({ type: "proposition", champs: corps.champs, aEcrireSoiMeme: corps.aEcrireSoiMeme ?? [] });
    } catch (erreur) {
      setEtat({ type: "erreur", raison: `GEN MOTION ne répond pas : ${(erreur as Error).message}` });
    }
  }

  const demander = (consigne: string) => void envoyer(consigne.trim(), aEviter);

  const autre = () => {
    if (etat.type !== "proposition") return;
    const ecartes = [...aEviter, ...Object.values(etat.champs)];
    setAEviter(ecartes);
    void envoyer(derniereConsigne, ecartes);
  };

  const oublier = () => setEtat({ type: "repos" });

  return { etat, demander, autre, oublier };
}
