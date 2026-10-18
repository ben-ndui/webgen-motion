import { NextRequest, NextResponse } from "next/server";

import { diffuserUnTelechargement } from "@/lib/flux-de-telechargement";
import { MODELES_WHISPER, telechargerUnModele } from "@/lib/modeles-whisper";

/**
 * POST /api/motion/whisper/telecharger — { modele: "medium" | "small" } :
 * télécharge le modèle officiel, vérifie taille et empreinte, et diffuse la
 * progression en NDJSON ({ type: "progress", recus, total } puis done ou error).
 * Un seul téléchargement à la fois : un second répond 409.
 */
let enCours = false;

export async function POST(req: NextRequest) {
  let corps: { modele?: unknown };
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête illisible" }, { status: 400 });
  }
  const modele = corps.modele === "medium" || corps.modele === "small" ? MODELES_WHISPER[corps.modele] : null;
  if (!modele) return NextResponse.json({ error: "modele : medium ou small" }, { status: 400 });
  if (enCours) return NextResponse.json({ error: "Un téléchargement est déjà en cours." }, { status: 409 });
  enCours = true;

  return diffuserUnTelechargement(
    (surProgression) => telechargerUnModele(modele, surProgression),
    () => {
      enCours = false;
    },
  );
}
