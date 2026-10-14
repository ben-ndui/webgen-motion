import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { existsSync, statSync } from "node:fs";

import { isFeatureEnabled } from "@/lib/edition";
import { POIDS_MINIMUM_D_UN_RENDU } from "@/lib/film-etat";
import { lireLigneDuRendu, lireRequeteDeRendu, preparerRendu } from "@/lib/film-rendu";
import { urlDuRendu } from "@/lib/film-store";
import { descendantsDe } from "@/lib/process-tree";
import { resolveRunnerSpawn } from "@/lib/runner-spawn";

/**
 * Rend une déclinaison d'un film de marque (`films/<id>.json`), ou ses plans
 * de bibliothèque (`rendu: "bibliotheque"`), en lançant
 * `scripts/render-film.ts`, et diffuse la progression en NDJSON : même
 * contrat que `/api/motion/tour/compose/run` (phase, progress, error avec la
 * fin du stderr, done). Fiche, déclinaison et médias sont vérifiés AVANT le
 * lancement : une fiche invalide répond 400 avec TOUTES ses erreurs.
 */
export async function POST(req: NextRequest) {
  let corps: unknown;
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const lecture = lireRequeteDeRendu(corps);
  if (!lecture.ok) return NextResponse.json({ error: lecture.erreur }, { status: 400 });
  const { filmId, declinaison, rendu, episode } = lecture.requete;

  if (!isFeatureEnabled("film-de-marque")) {
    return NextResponse.json(
      { error: "studio-required", message: "Le rendu des films de marque est une feature Studio Edition." },
      { status: 403 },
    );
  }

  const preparation = preparerRendu(filmId, declinaison, { type: rendu, episode });
  if (!preparation.ok) {
    return NextResponse.json(
      { error: "Rendu refusé", erreurs: preparation.erreurs },
      { status: preparation.statut },
    );
  }

  const argumentsDuRunner = ["--film-id", filmId, "--declinaison", declinaison];
  if (rendu === "bibliotheque") argumentsDuRunner.push("--bibliotheque");
  if (rendu === "episode" && episode) argumentsDuRunner.push("--episode", episode);
  const spawnSpec = resolveRunnerSpawn("render-film", argumentsDuRunner);
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
          const evenement = lireLigneDuRendu(ligne.trim());
          if (evenement) emettre(evenement);
        }
      });
      proc.stderr.on("data", (morceau) => {
        const texte = morceau.toString();
        tamponErreur += texte;
        process.stderr.write(`[render-film] ${texte}`);
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
            message: code === 143 ? "Rendu annulé" : `Rendu en échec (code ${code})`,
            wallSec,
            stderr: tamponErreur.slice(-2000),
          });
          fermer();
          return;
        }
        // Succès seulement si CE rendu a produit le fichier : un mp4 laissé
        // par une tentative précédente ne compte pas.
        const sortie = preparation.sortie;
        const infos = existsSync(sortie) ? statSync(sortie) : null;
        if (!infos || infos.size < POIDS_MINIMUM_D_UN_RENDU || infos.mtimeMs < debut) {
          emettre({ type: "error", message: "Vidéo absente, vide, ou plus ancienne que ce rendu", wallSec });
          fermer();
          return;
        }
        emettre({
          type: "done",
          ok: true,
          filmId,
          declinaison,
          rendu,
          url: urlDuRendu(filmId, declinaison, Math.round(infos.mtimeMs), rendu, episode),
          sizeBytes: infos.size,
          wallSec,
        });
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
