"use client";

import { useState } from "react";

import type { ChoixDesPages, GroupeDEcrans } from "@/lib/site/choix-des-pages";
import { lireLeFlux } from "../lire-le-flux";

export type ResumeDuFilmage = { posees: number; echecs: string[]; moments?: number };

export type EtatDesEcrans =
  | { type: "repos" }
  | { type: "lecture"; etape: string }
  // `urls` : la page retenue pour chaque case, modifiable avant de garder.
  | { type: "proposition"; choix: ChoixDesPages; urls: string[]; aEviter: string[] }
  | { type: "filmage"; etape: string }
  | { type: "fait"; resume: ResumeDuFilmage }
  | { type: "erreur"; message: string };

type Lieux = { id: string; avantDeFilmer: () => Promise<boolean>; apresLeFilmage: () => Promise<void> };

/**
 * « Choisir les pages avec Claude » pour un groupe de cases : Claude propose
 * une page par case, la personne change celles qu'elle veut, puis « Garder »
 * les filme. La fiche est enregistrée avant et relue après : le filmage la réécrit.
 */
export function useEcransAvecClaude({ id, avantDeFilmer, apresLeFilmage }: Lieux, groupe: GroupeDEcrans) {
  const [etat, setEtat] = useState<EtatDesEcrans>({ type: "repos" });

  async function appeler(corps: Record<string, unknown>, enCours: (etape: string) => EtatDesEcrans): Promise<Record<string, unknown> | null> {
    setEtat(enCours("Ouverture du site…"));
    let fin: Record<string, unknown> | null = null;
    let erreur = "La lecture du site s'est arrêtée sans résultat.";
    try {
      const reponse = await fetch(`/api/motion/film/${encodeURIComponent(id)}/ecrans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...corps, groupe }),
      });
      if (!reponse.ok) {
        const refus = (await reponse.json().catch(() => ({}))) as { erreur?: string };
        setEtat({ type: "erreur", message: refus.erreur ?? `Lancement impossible (erreur ${reponse.status}).` });
        return null;
      }
      await lireLeFlux(reponse, (evenement) => {
        if (evenement.type === "phase" && typeof evenement.label === "string") setEtat(enCours(evenement.label));
        if (evenement.type === "done") fin = evenement;
        if (evenement.type === "error") erreur = typeof evenement.message === "string" ? evenement.message : erreur;
      });
    } catch {
      erreur = "GEN MOTION ne répond pas.";
    }
    if (!fin) setEtat({ type: "erreur", message: erreur });
    return fin;
  }

  const proposer = async (url: string, aEviter: string[] = []) => {
    const fin = await appeler({ geste: "proposer", url, aEviter }, (etape) => ({ type: "lecture", etape }));
    const choix = fin?.choix as ChoixDesPages | undefined;
    if (choix) setEtat({ type: "proposition", choix, urls: choix.cases.map((c) => c.url), aEviter });
  };

  const changerLaPage = (indexDeCase: number, url: string) => {
    if (etat.type !== "proposition") return;
    setEtat({ ...etat, urls: etat.urls.map((u, i) => (i === indexDeCase ? url : u)) });
  };

  // « Autre proposition » : on écarte les pages que Claude vient de proposer.
  const autre = (url: string) => {
    if (etat.type !== "proposition") return;
    void proposer(url, [...etat.aEviter, ...etat.choix.cases.map((c) => c.url)]);
  };

  const garder = async (url: string) => {
    if (etat.type !== "proposition") return;
    const pages = etat.urls;
    if (!(await avantDeFilmer())) {
      setEtat({ type: "erreur", message: "Enregistrement impossible : rien n'a été filmé." });
      return;
    }
    const fin = await appeler({ geste: "filmer", url, pages }, (etape) => ({ type: "filmage", etape }));
    // Même sur une erreur, des cases ont pu changer : on relit toujours la fiche.
    await apresLeFilmage();
    const resume = fin?.resume as ResumeDuFilmage | undefined;
    if (resume) setEtat({ type: "fait", resume });
  };

  const refuser = () => setEtat({ type: "repos" });

  return { etat, proposer, changerLaPage, autre, garder, refuser };
}
