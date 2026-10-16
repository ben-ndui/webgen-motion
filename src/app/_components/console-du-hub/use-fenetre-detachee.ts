import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import {
  ADRESSE_DE_LA_FENETRE,
  CANAL,
  CLE_DES_PRISES,
  type MessageDuCanal,
  type ModeDeLaConsole,
  NOM_DE_LA_FENETRE,
  TAILLE_DE_LA_FENETRE,
  modeEnregistre,
} from "./reglages-de-la-console";

type Parametres = {
  mode: ModeDeLaConsole;
  changerDeMode: (mode: ModeDeLaConsole) => void;
  signaler: (texte: string) => void;
};

/**
 * La console dans une fenêtre séparée (multi-écran), reliée au tableau de
 * bord par un BroadcastChannel : elle peut y ouvrir un tour, y signaler une
 * création, y recopier ses prises. Quand elle se ferme, la barre du bas revient.
 */
export function useFenetreDetachee({ mode, changerDeMode, signaler }: Parametres) {
  const router = useRouter();
  const fenetre = useRef<Window | null>(null);
  const canal = useRef<BroadcastChannel | null>(null);
  const pingsEnAttente = useRef(new Map<string, (vivante: boolean) => void>());
  const modeActuel = useRef(mode);
  useEffect(() => {
    modeActuel.current = mode;
  }, [mode]);

  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    const ch = new BroadcastChannel(CANAL);
    canal.current = ch;
    ch.onmessage = (e: MessageEvent) => {
      const message = e.data as MessageDuCanal;
      if (message.t === "ping") ch.postMessage({ t: "pong", nonce: message.nonce } satisfies MessageDuCanal);
      if (message.t === "open-tour") router.push(`/tour/${encodeURIComponent(message.tourId)}`);
      if (message.t === "tour-created") router.refresh();
      if (message.t === "takes-sync") {
        // Les prises de la détachée survivent à son retour dans la page.
        try {
          sessionStorage.setItem(CLE_DES_PRISES, message.payload);
        } catch {}
      }
      if (message.t === "main-pong") {
        const repondre = pingsEnAttente.current.get(message.nonce);
        pingsEnAttente.current.delete(message.nonce);
        repondre?.(true);
      }
      if (message.t === "bye" && modeActuel.current === "fenetre") changerDeMode("fermee");
    };
    return () => {
      canal.current = null;
      ch.close();
    };
  }, [router, changerDeMode]);

  /** La fenêtre détachée répond-elle ? (800 ms pour le dire) */
  const laFenetreRepond = useCallback((delaiMs = 800): Promise<boolean> => {
    const ch = canal.current;
    if (!ch) return Promise.resolve(false);
    return new Promise((resolve) => {
      const nonce = Math.random().toString(36).slice(2);
      pingsEnAttente.current.set(nonce, resolve);
      ch.postMessage({ t: "main-ping", nonce } satisfies MessageDuCanal);
      window.setTimeout(() => {
        if (pingsEnAttente.current.delete(nonce)) resolve(false);
      }, delaiMs);
    });
  }, []);

  // Rechargement du tableau de bord : on a perdu la référence, on demande.
  useEffect(() => {
    if (modeEnregistre() !== "fenetre") return;
    laFenetreRepond().then((vivante) => changerDeMode(vivante ? "fenetre" : "fermee"));
  }, [laFenetreRepond, changerDeMode]);

  const ouvrirLaFenetre = useCallback(() => {
    const ouverte = window.open(ADRESSE_DE_LA_FENETRE, NOM_DE_LA_FENETRE, TAILLE_DE_LA_FENETRE);
    if (!ouverte) {
      // Fenêtre bloquée (ou l'app de bureau, qui n'ouvre pas de fenêtre ainsi).
      signaler("fenêtre séparée indisponible ici : console flottante");
      changerDeMode("flottante");
      return;
    }
    fenetre.current = ouverte;
    changerDeMode("fenetre");
  }, [changerDeMode, signaler]);

  useEffect(() => {
    if (mode !== "fenetre") return;
    const surveillance = window.setInterval(() => {
      if (fenetre.current?.closed) {
        fenetre.current = null;
        changerDeMode("fermee");
      }
    }, 1000);
    return () => window.clearInterval(surveillance);
  }, [mode, changerDeMode]);

  const recupererLaFenetre = useCallback(async () => {
    const ouverte = fenetre.current;
    if (ouverte && !ouverte.closed) {
      ouverte.focus();
      canal.current?.postMessage({ t: "focus" } satisfies MessageDuCanal);
      return;
    }
    const vivante = await laFenetreRepond();
    if (vivante) canal.current?.postMessage({ t: "focus" } satisfies MessageDuCanal);
    else changerDeMode("fermee");
  }, [laFenetreRepond, changerDeMode]);

  return { ouvrirLaFenetre, recupererLaFenetre };
}
