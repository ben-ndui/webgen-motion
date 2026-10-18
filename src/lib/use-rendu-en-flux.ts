"use client";

import { useCallback, useRef, useState } from "react";

import { ETAPES_DU_RENDU, type EtapeDuRendu } from "./suivi-du-rendu";

/**
 * Lance UN rendu par une route qui répond en NDJSON (phase, progress, error,
 * done) et suit son état, par clé. Un seul rendu à la fois sur la page : un
 * rendu Remotion occupe déjà toute la machine. Sorti de useRenduDeFilm le
 * 16/10/2026 pour servir aussi les formats (même contrat de route).
 */

export type EtatDuRendu =
  | { type: "repos" }
  // `etape` absente : un flux qui ne parle pas d'étapes (l'écoute des paroles) ;
  // `restant` : secondes estimées par Remotion, null quand il ne sait pas ;
  // `debut` : l'instant du lancement (Date.now()), pour le temps écoulé.
  | { type: "en-cours"; label: string; frames: number; total: number; etape?: EtapeDuRendu; restant: number | null; debut: number }
  | { type: "erreur"; message: string; details: string[] }
  // `duree` : secondes du clic au rendu fini ; null pour un rendu lu sur le disque (non mesuré).
  | { type: "fait"; url: string; octets: number; duree: number | null };

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

function lireLEtape(valeur: unknown): EtapeDuRendu | undefined {
  return ETAPES_DU_RENDU.find((etape) => etape === valeur);
}

// La fin du stderr de Remotion : utile au développeur, illisible en entier.
function dernieresLignes(texte: unknown): string[] {
  if (typeof texte !== "string") return [];
  return texte.trim().split("\n").filter(Boolean).slice(-6);
}

export function useRenduEnFlux(adresse: string) {
  const [enCours, setEnCours] = useState<string | null>(null);
  const [etats, setEtats] = useState<Record<string, EtatDuRendu>>({});
  const annulation = useRef<AbortController | null>(null);

  const poser = (cle: string, etat: EtatDuRendu) => setEtats((avant) => ({ ...avant, [cle]: etat }));

  const lancer = useCallback(
    async (cle: string, corpsDeLaRequete: Record<string, unknown>) => {
      if (annulation.current) return;
      const controleur = new AbortController();
      annulation.current = controleur;
      setEnCours(cle);
      const debut = Date.now();
      // L'étape « Préparation » dès le clic : la frise ne saute pas quand la bannière arrive.
      poser(cle, { type: "en-cours", label: "Lancement du rendu…", frames: 0, total: 0, etape: "preparation", restant: null, debut });
      // Un flux qui se ferme sans « done » ni « error » n'est PAS un succès.
      let conclu = false;
      try {
        const reponse = await fetch(adresse, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(corpsDeLaRequete),
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
              const etape = lireLEtape(evenement.etape) ?? (actuel?.type === "en-cours" ? actuel.etape : undefined);
              // Une nouvelle étape repart de zéro : la barre de la précédente ne déborde pas sur elle.
              const memeEtape = actuel?.type === "en-cours" && actuel.etape === etape;
              const base = memeEtape ? actuel : { frames: 0, total: 0, restant: null };
              return { ...avant, [cle]: { ...base, type: "en-cours", label: String(evenement.label ?? ""), etape, debut } };
            });
          } else if (evenement.type === "progress") {
            poser(cle, {
              type: "en-cours",
              label: String(evenement.label ?? ""),
              frames: Number(evenement.frames ?? 0),
              total: Number(evenement.total ?? 0),
              etape: lireLEtape(evenement.etape),
              restant: typeof evenement.restant === "number" ? evenement.restant : null,
              debut,
            });
          } else if (evenement.type === "error") {
            conclu = true;
            poser(cle, { type: "erreur", message: String(evenement.message ?? "Rendu en échec"), details: dernieresLignes(evenement.stderr) });
          } else if (evenement.type === "done" && evenement.ok) {
            conclu = true;
            // Mesurée comme l'écoulé affiché pendant le rendu (depuis le clic) : les deux concordent.
            const duree = Math.round((Date.now() - debut) / 1000);
            poser(cle, { type: "fait", url: String(evenement.url ?? ""), octets: Number(evenement.sizeBytes ?? 0), duree });
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
    [adresse],
  );

  const annuler = useCallback(() => annulation.current?.abort(), []);

  return { enCours, etats, lancer, annuler };
}
