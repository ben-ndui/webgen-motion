import { spawn } from "node:child_process";
import { type Stats, existsSync, statSync } from "node:fs";

import { POIDS_MINIMUM_D_UN_RENDU } from "./film-etat";
import { lireLigneDuRendu } from "./film-rendu";
import { descendantsDe } from "./process-tree";
import type { RunnerSpawn } from "./runner-spawn";

/**
 * Lance un runner de rendu (render-film, render-format) et diffuse sa
 * progression en NDJSON : phase, progress, error (avec la fin du stderr),
 * done. Sorti tel quel de la route des films le 16/10/2026, pour que la route
 * des formats suive EXACTEMENT les mêmes règles (annulation, fichier vérifié).
 */
export type OptionsDuFlux = {
  spawnSpec: RunnerSpawn;
  // Le livrable que CE rendu doit produire.
  sortie: string;
  // Préfixe du stderr relayé dans le journal du serveur.
  journal: string;
  // Ce que l'événement « done » ajoute (l'URL du rendu, l'id…).
  termine: (infos: Stats) => Record<string, unknown>;
  // Un runner qui n'est pas un rendu (le calage des paroles) : son nom dans les messages,
  // sa lecture des lignes, et le poids minimum de ce qu'il produit (un JSON, pas un mp4).
  quoi?: string;
  lireLigne?: (ligne: string) => { type: string; label: string } | null;
  poidsMinimum?: number;
};

export function diffuserLeRendu(options: OptionsDuFlux): Response {
  const { spawnSpec } = options;
  const debut = Date.now();

  // Annulation (le client coupe le flux) : on tue le GROUPE de process
  // (detached + kill(-pid)). En dev, la chaîne npx → tsx → runner → Remotion
  // ne relaie pas SIGTERM et laisserait des orphelins. Remotion traîne sur
  // SIGTERM (constaté : il continuait à rendre) et son navigateur vit hors du
  // groupe : on relève toute la descendance AVANT de signaler, puis SIGKILL
  // au groupe et à chaque descendant après 10 s.
  let enfant: ReturnType<typeof spawn> | null = null;
  const signaler = (pid: number, signal: NodeJS.Signals) => {
    try {
      process.kill(pid, signal);
    } catch {
      // Process déjà terminé : rien à tuer.
    }
  };
  const tuerLeRendu = () => {
    const pid = enfant?.pid;
    if (!pid) return;
    if (process.platform === "win32") {
      enfant?.kill("SIGTERM");
      return;
    }
    const descendants = descendantsDe(pid);
    signaler(-pid, "SIGTERM");
    for (const descendant of descendants) signaler(descendant, "SIGTERM");
    setTimeout(() => {
      signaler(-pid, "SIGKILL");
      for (const descendant of descendants) signaler(descendant, "SIGKILL");
    }, 10_000).unref();
  };

  const flux = new ReadableStream({
    cancel() {
      tuerLeRendu();
    },
    start(controller) {
      const encodeur = new TextEncoder();
      const emettre = (evenement: Record<string, unknown>) => {
        try {
          controller.enqueue(encodeur.encode(JSON.stringify(evenement) + "\n"));
        } catch {}
      };
      const fermer = () => {
        try {
          controller.close();
        } catch {}
      };

      emettre({ type: "phase", label: "Lancement du rendu…" });

      const proc = spawn(spawnSpec.command, spawnSpec.args, {
        cwd: spawnSpec.cwd,
        env: { ...process.env, NO_COLOR: "1" },
        detached: process.platform !== "win32",
      });
      enfant = proc;

      let tamponSortie = "";
      let tamponErreur = "";
      proc.stdout.on("data", (morceau) => {
        tamponSortie += morceau.toString();
        const lignes = tamponSortie.split("\n");
        tamponSortie = lignes.pop() ?? "";
        for (const ligne of lignes) {
          const evenement = (options.lireLigne ?? lireLigneDuRendu)(ligne.trim());
          if (evenement) emettre(evenement);
        }
      });
      proc.stderr.on("data", (morceau) => {
        const texte = morceau.toString();
        tamponErreur += texte;
        process.stderr.write(`[${options.journal}] ${texte}`);
      });

      proc.on("error", (erreur) => {
        emettre({ type: "error", message: `Spawn failed: ${erreur.message}` });
        fermer();
      });

      proc.on("close", (code) => {
        const wallSec = Math.round((Date.now() - debut) / 1000);
        if (code !== 0) {
          emettre({
            type: "error",
            message: code === 143 ? `${options.quoi ?? "Rendu"} annulé` : `${options.quoi ?? "Rendu"} en échec (code ${code})`,
            wallSec,
            stderr: tamponErreur.slice(-2000),
          });
          fermer();
          return;
        }
        // Succès seulement si CE rendu a produit le fichier : un mp4 laissé
        // par une tentative précédente ne compte pas.
        const sortie = options.sortie;
        const infos = existsSync(sortie) ? statSync(sortie) : null;
        if (!infos || infos.size < (options.poidsMinimum ?? POIDS_MINIMUM_D_UN_RENDU) || infos.mtimeMs < debut) {
          const message = options.quoi ? `${options.quoi} : résultat absent, vide, ou plus ancien que ce lancement` : "Vidéo absente, vide, ou plus ancienne que ce rendu";
          emettre({ type: "error", message, wallSec });
          fermer();
          return;
        }
        emettre({ type: "done", ok: true, ...options.termine(infos), sizeBytes: infos.size, wallSec });
        fermer();
      });
    },
  });

  return new Response(flux, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
