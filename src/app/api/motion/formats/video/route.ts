import { NextResponse } from "next/server";
import { existsSync } from "node:fs";

import { estNomSur, fichiersDuRendu } from "@/lib/film-store";
import { getFormatOutDir } from "@/lib/formats/format-store";
import { reponseVideo } from "@/lib/servir-une-video";

/**
 * Sert le mp4 rendu d'une déclinaison d'un projet de format (avec les plages,
 * pour avancer dans la vidéo). ?id=<projet>&declinaison=<nom> : deux noms sûrs,
 * aucun chemin ne sort de `out/`.
 */
function cheminDemande(req: Request): { chemin: string } | { erreur: NextResponse } {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const declinaison = url.searchParams.get("declinaison");
  if (!estNomSur(id) || !estNomSur(declinaison)) return { erreur: NextResponse.json({ error: "Invalid id or declinaison" }, { status: 400 }) };
  return { chemin: fichiersDuRendu(getFormatOutDir(id), declinaison).livrable };
}

export async function HEAD(req: Request) {
  const demande = cheminDemande(req);
  if ("erreur" in demande) return demande.erreur;
  return new NextResponse(null, { status: existsSync(demande.chemin) ? 200 : 404, headers: { "Cache-Control": "no-store" } });
}

export async function GET(req: Request) {
  const demande = cheminDemande(req);
  if ("erreur" in demande) return demande.erreur;
  if (!existsSync(demande.chemin)) return NextResponse.json({ error: "Rendu introuvable : lancer le rendu d'abord" }, { status: 404 });
  return reponseVideo(req, demande.chemin);
}
