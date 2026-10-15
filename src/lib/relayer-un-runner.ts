import { spawn } from "node:child_process";

import type { RunnerSpawn } from "./runner-spawn";

/**
 * Lance un runner et relaie sa progression NDJSON au navigateur (phase…,
 * puis done ou error). Le client qui coupe le flux arrête le runner ET son
 * navigateur (groupe de process). Un runner mort sans rien dire rend une
 * erreur : l'écran ne reste jamais en attente. SERVEUR SEULEMENT.
 */
export function relayerUnRunner(lancement: RunnerSpawn, options: { quandFini: () => void; messageSiArret: string }): Response {
  const encodeur = new TextEncoder();
  let enfant: ReturnType<typeof spawn> | null = null;
  let libere = false;
  const liberer = () => {
    if (libere) return;
    libere = true;
    options.quandFini();
  };

  const flux = new ReadableStream({
    start(controleur) {
      const emettre = (evenement: Record<string, unknown>) => {
        try {
          controleur.enqueue(encodeur.encode(`${JSON.stringify(evenement)}\n`));
        } catch {
          // flux déjà fermé (client parti)
        }
      };
      const fermer = () => {
        try {
          controleur.close();
        } catch {
          // déjà fermé
        }
      };
      // `detached` : le runner et SON navigateur forment un groupe, qu'on tue en entier à l'arrêt.
      enfant = spawn(lancement.command, lancement.args, { cwd: lancement.cwd, env: { ...process.env, NO_COLOR: "1" }, detached: true });
      let reste = "";
      let erreurs = "";
      let termine = false;
      enfant.stdout?.on("data", (morceau: Buffer) => {
        reste += morceau.toString();
        const lignes = reste.split("\n");
        reste = lignes.pop() ?? "";
        for (const ligne of lignes) {
          if (!ligne.trim()) continue;
          try {
            const evenement = JSON.parse(ligne) as Record<string, unknown>;
            if (evenement.type === "done" || evenement.type === "error") termine = true;
            emettre(evenement);
          } catch {
            // ligne de journal d'une dépendance : pas pour l'écran
          }
        }
      });
      enfant.stderr?.on("data", (morceau: Buffer) => {
        erreurs = (erreurs + morceau.toString()).slice(-2000);
      });
      enfant.on("exit", liberer);
      enfant.on("error", (erreur) => {
        liberer();
        emettre({ type: "error", message: `Lancement impossible : ${erreur.message}` });
        fermer();
      });
      enfant.on("close", (code) => {
        if (!termine) emettre({ type: "error", message: `${options.messageSiArret} (code ${code}).`, details: erreurs });
        fermer();
      });
    },
    cancel() {
      const pid = enfant?.pid;
      if (!pid) return;
      try {
        process.kill(-pid, "SIGKILL");
      } catch {
        enfant?.kill("SIGKILL");
      }
    },
  });

  return new Response(flux, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
}
