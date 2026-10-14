"use client";

import { useCallback, useRef, useState } from "react";

import type { TypeDeRendu } from "@/lib/film-store";

/**
 * Lance le rendu d'UNE déclinaison par `POST /api/motion/film/render` et lit
 * le flux NDJSON (phase, progress, error, done). Un seul rendu à la fois sur
 * la page : un rendu Remotion occupe déjà toute la machine. Le film et la
 * bibliothèque d'une même déclinaison ont chacun leur état (`cleDuRendu`).
 */

/** La clé d'état d'un rendu : « film:Court-FR », « bibliotheque:Court-FR », « episode:Court-FR:ep1 ». */
export function cleDuRendu(type: TypeDeRendu, nom: string, episode?: string): string {
  return episode ? `${type}:${nom}:${episode}` : `${type}:${nom}`;
}

export type EtatDuRendu =
  | { type: "repos" }
  | { type: "en-cours"; label: string; frames: number; total: number }
  | { type: "erreur"; message: string; details: string[] }
  | { type: "fait"; url: string; octets: number };

type Evenement = Record<string, unknown>;

async function lireLeFlux(corps: ReadableStream<Uint8Array>, surEvenement: (e: Evenement) => void): Promise<void> {
  const lecteur = corps.getReader();
  const decodeur = new TextDecoder();
  let tampon = "";
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) break;
    tampon += decodeur.decode(value, { stream: true });
    const lignes = tampon.split("\n");
    tampon = lignes.pop() ?? "";
    for (const ligne of lignes) {
      if (ligne.trim()) surEvenement(JSON.parse(ligne) as Evenement);
    }
  }
  if (tampon.trim()) surEvenement(JSON.parse(tampon) as Evenement);
}

// La fin du stderr de Remotion : utile au développeur, illisible en entier.
function dernieresLignes(texte: unknown): string[] {
  if (typeof texte !== "string") return [];
  return texte.trim().split("\n").filter(Boolean).slice(-6);
}

export function useRenduDeFilm(filmId: string) {
  const [enCours, setEnCours] = useState<string | null>(null);
  const [etats, setEtats] = useState<Record<string, EtatDuRendu>>({});
  const annulation = useRef<AbortController | null>(null);

  const poser = (cle: string, etat: EtatDuRendu) => setEtats((avant) => ({ ...avant, [cle]: etat }));

  const lancer = useCallback(
    async (declinaison: string, type: TypeDeRendu = "film", episode?: string) => {
      if (annulation.current) return;
      const cle = cleDuRendu(type, declinaison, episode);
      const controleur = new AbortController();
      annulation.current = controleur;
      setEnCours(cle);
      poser(cle, { type: "en-cours", label: "Lancement du rendu…", frames: 0, total: 0 });
      // Un flux qui se ferme sans « done » ni « error » n'est PAS un succès.
      let conclu = false;
      try {
        const reponse = await fetch("/api/motion/film/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filmId, declinaison, rendu: type, ...(episode ? { episode } : {}) }),
          signal: controleur.signal,
        });
        if (!reponse.ok || !reponse.body) {
          const json = (await reponse.json().catch(() => null)) as { error?: string; message?: string; erreurs?: string[] } | null;
          const message = json?.message ?? json?.error ?? `Rendu refusé (${reponse.status})`;
          poser(cle, { type: "erreur", message, details: json?.erreurs ?? [] });
          return;
        }
        await lireLeFlux(reponse.body, (evenement) => {
          if (evenement.type === "phase") {
            setEtats((avant) => {
              const actuel = avant[cle];
              const base = actuel?.type === "en-cours" ? actuel : { frames: 0, total: 0 };
              return { ...avant, [cle]: { ...base, type: "en-cours", label: String(evenement.label ?? "") } };
            });
          } else if (evenement.type === "progress") {
            poser(cle, {
              type: "en-cours",
              label: String(evenement.label ?? ""),
              frames: Number(evenement.frames ?? 0),
              total: Number(evenement.total ?? 0),
            });
          } else if (evenement.type === "error") {
            conclu = true;
            poser(cle, { type: "erreur", message: String(evenement.message ?? "Rendu en échec"), details: dernieresLignes(evenement.stderr) });
          } else if (evenement.type === "done" && evenement.ok) {
            conclu = true;
            poser(cle, { type: "fait", url: String(evenement.url ?? ""), octets: Number(evenement.sizeBytes ?? 0) });
          }
        });
        if (!conclu) poser(cle, { type: "erreur", message: "Le rendu s'est arrêté sans résultat.", details: [] });
      } catch (erreur) {
        const annule = (erreur as Error).name === "AbortError";
        poser(cle, { type: "erreur", message: annule ? "Rendu annulé." : (erreur as Error).message, details: [] });
      } finally {
        annulation.current = null;
        setEnCours(null);
      }
    },
    [filmId],
  );

  const annuler = useCallback(() => annulation.current?.abort(), []);

  return { enCours, etats, lancer, annuler };
}
