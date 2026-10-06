import { NextResponse } from "next/server";
import { existsSync, readFileSync, statSync } from "node:fs";

import { estNomSur, fichiersDuRendu, getFilmOutDir } from "@/lib/film-store";

/**
 * Sert le mp4 rendu d'une déclinaison de film (sur le modèle de
 * `tour/preview/final`). Query : ?id=<filmId>&declinaison=<nom>, deux noms
 * sûrs (lettres, chiffres, _ et -) : aucun chemin ne sort de `out/`.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const declinaison = url.searchParams.get("declinaison");
  if (!estNomSur(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  if (!estNomSur(declinaison)) return NextResponse.json({ error: "Invalid declinaison" }, { status: 400 });

  const chemin = fichiersDuRendu(getFilmOutDir(id), declinaison).livrable;
  if (!existsSync(chemin)) {
    return NextResponse.json({ error: "Rendu introuvable : lancer le rendu d'abord" }, { status: 404 });
  }

  const contenu = readFileSync(chemin);
  return new NextResponse(new Uint8Array(contenu), {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(statSync(chemin).size),
      "Cache-Control": "no-store",
    },
  });
}
