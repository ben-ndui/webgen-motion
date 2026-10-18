import { NextRequest, NextResponse } from "next/server";
import { isFeatureEnabled } from "@/lib/edition";
import { lireRequeteDeRendu, preparerRendu } from "@/lib/film-rendu";
import { urlDuRendu } from "@/lib/film-store";
import { diffuserLeRendu } from "@/lib/rendu-en-flux";
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

  return diffuserLeRendu({
    spawnSpec,
    sortie: preparation.sortie,
    journal: "render-film",
    termine: (infos) => ({
      filmId,
      declinaison,
      rendu,
      url: urlDuRendu(filmId, declinaison, Math.round(infos.mtimeMs), rendu, episode),
    }),
  });
}
