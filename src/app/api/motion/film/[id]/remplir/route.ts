import { spawn } from "node:child_process";
import { NextRequest, NextResponse } from "next/server";

import { estNomSur } from "@/lib/film-store";
import { resolveRunnerSpawn } from "@/lib/runner-spawn";
import { normaliserLAdresse } from "@/lib/site/pages-du-site";

/**
 * POST /api/motion/film/<id>/remplir { url } — lance `scripts/remplir-film.ts`
 * et relaie sa progression en NDJSON (phase…, puis done ou error). Le client
 * qui coupe le flux arrête le navigateur invisible.
 */
// Un remplissage à la fois par film : deux navigateurs réécrivant la même
// fiche et les mêmes captures s'emmêleraient.
const EN_COURS = new Set<string>();

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!estNomSur(id)) return NextResponse.json({ erreur: "Film invalide" }, { status: 400 });
  let corps: { url?: unknown };
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ erreur: "Requête illisible" }, { status: 400 });
  }
  const url = typeof corps.url === "string" ? normaliserLAdresse(corps.url) : null;
  if (!url) return NextResponse.json({ erreur: "Cette adresse ne ressemble pas à un site (exemple : monsite.fr)" }, { status: 400 });

  if (EN_COURS.has(id)) return NextResponse.json({ erreur: "Un remplissage est déjà en cours pour ce film." }, { status: 409 });
  EN_COURS.add(id);

  const lancement = resolveRunnerSpawn("remplir-film", ["--film-id", id, "--url", url]);
  const encodeur = new TextEncoder();
  let enfant: ReturnType<typeof spawn> | null = null;

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
      enfant.on("exit", () => EN_COURS.delete(id));
      enfant.on("error", (erreur) => {
        EN_COURS.delete(id);
        emettre({ type: "error", message: `Lancement impossible : ${erreur.message}` });
        fermer();
      });
      enfant.on("close", (code) => {
        // Un runner mort sans rien dire ne doit pas laisser l'écran en attente.
        if (!termine) emettre({ type: "error", message: `La lecture du site s'est arrêtée (code ${code}).`, details: erreurs });
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
