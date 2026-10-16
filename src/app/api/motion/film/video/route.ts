import { NextResponse } from "next/server";
import { existsSync } from "node:fs";

import { estNomSur, estTypeDeRendu, fichiersDuRendu, getFilmOutDir } from "@/lib/film-store";
import { reponseVideo } from "@/lib/servir-une-video";

/**
 * Sert le mp4 rendu d'une déclinaison de film (sur le modèle de
 * `tour/preview/final`). Query : ?id=<filmId>&declinaison=<nom>, deux noms
 * sûrs (lettres, chiffres, _ et -) : aucun chemin ne sort de `out/`.
 * `&rendu=bibliotheque` sert le rendu des plans de la bibliothèque,
 * `&rendu=episode&episode=<id>` celui d'un épisode de la série.
 */

/** Le chemin du rendu demandé, ou la réponse d'erreur (noms non sûrs). */
function cheminDemande(req: Request): { chemin: string } | { erreur: NextResponse } {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const declinaison = url.searchParams.get("declinaison");
  const refus = (message: string) => ({ erreur: NextResponse.json({ error: message }, { status: 400 }) });
  if (!estNomSur(id)) return refus("Invalid id");
  if (!estNomSur(declinaison)) return refus("Invalid declinaison");
  const rendu = url.searchParams.get("rendu") ?? "film";
  if (!estTypeDeRendu(rendu)) return refus("Invalid rendu");
  const episode = url.searchParams.get("episode") ?? undefined;
  if (rendu === "episode" && !estNomSur(episode)) return refus("Invalid episode");
  return { chemin: fichiersDuRendu(getFilmOutDir(id), declinaison, rendu, episode).livrable };
}

/** HEAD : le rendu existe-t-il ? Sans télécharger la vidéo (l'écran de la série s'en sert à l'ouverture). */
export async function HEAD(req: Request) {
  const demande = cheminDemande(req);
  if ("erreur" in demande) return demande.erreur;
  return new NextResponse(null, { status: existsSync(demande.chemin) ? 200 : 404, headers: { "Cache-Control": "no-store" } });
}

export async function GET(req: Request) {
  const demande = cheminDemande(req);
  if ("erreur" in demande) return demande.erreur;
  const { chemin } = demande;
  if (!existsSync(chemin)) {
    return NextResponse.json({ error: "Rendu introuvable : lancer le rendu d'abord" }, { status: 404 });
  }

  return reponseVideo(req, chemin);
}
