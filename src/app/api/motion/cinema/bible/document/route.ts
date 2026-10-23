import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { extraireLeTexteDuDocument } from "@/lib/cinema/bible/document";
import { studioRequis } from "@/lib/cinema/reponse-http";

export const runtime = "nodejs";

// Le proxy de GEN MOTION (src/middleware.ts) acceptait par défaut 10 Mo sur
// /api/motion/** (plafond Next), relevé à 50 Mo (next.config.ts) : une bible
// avec quelques images de référence peut peser plus que du texte seul.
// Rester en dessous du plafond proxy laisse de la marge pour les en-têtes
// multipart.
const TAILLE_MAX_OCTETS = 20 * 1024 * 1024;

/**
 * POST /api/motion/cinema/bible/document — extrait le texte d'un PDF ou d'un
 * document Word déposé (multipart, champ « fichier », format reconnu par
 * signature) pour préremplir l'import de bible de la série. N'écrit rien
 * dans le film : juste le texte, à l'écran de décider quoi en faire (même
 * proposition à garder ou non que le reste de l'assistant).
 */
export async function POST(req: NextRequest) {
  const porte = studioRequis();
  if (porte) return porte;

  let donnees: FormData;
  try {
    donnees = await req.formData();
  } catch {
    return NextResponse.json({ erreur: "Envoi illisible" }, { status: 400 });
  }

  const fichier = donnees.get("fichier");
  if (!(fichier instanceof Blob) || fichier.size === 0) {
    return NextResponse.json({ erreur: "Aucun fichier reçu" }, { status: 400 });
  }
  if (fichier.size > TAILLE_MAX_OCTETS) {
    return NextResponse.json({ erreur: `Fichier trop gros (${Math.round(fichier.size / 1024 / 1024)} Mo) : limite 20 Mo.` }, { status: 400 });
  }

  try {
    const lecture = await extraireLeTexteDuDocument(new Uint8Array(await fichier.arrayBuffer()));
    if (!lecture.ok) return NextResponse.json({ erreur: lecture.raison }, { status: 422 });
    return NextResponse.json(
      { texte: lecture.texte, tronque: lecture.tronque, longueurOriginale: lecture.longueurOriginale },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (erreur) {
    return NextResponse.json({ erreur: `Le fichier n'a pas pu être lu : ${(erreur as Error).message}` }, { status: 500 });
  }
}
