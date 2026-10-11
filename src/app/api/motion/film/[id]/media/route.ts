import { NextRequest, NextResponse } from "next/server";

import { deposerCapture, deposerLogo, deposerMusique } from "@/lib/film-depot";

/**
 * POST /api/motion/film/<id>/media — dépose un fichier (multipart) :
 *   role = « capture » (+ relatif : la case attendue), « musique » ou « logo »,
 *   fichier = le fichier.
 * Le serveur range, renomme et mesure : la personne n'a rien à nommer.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let formulaire: FormData;
  try {
    formulaire = await req.formData();
  } catch {
    return NextResponse.json({ erreur: "Envoi illisible" }, { status: 400 });
  }
  const role = formulaire.get("role");
  const fichier = formulaire.get("fichier");
  if (!(fichier instanceof File)) return NextResponse.json({ erreur: "Aucun fichier reçu" }, { status: 400 });
  const octets = new Uint8Array(await fichier.arrayBuffer());

  let resultat;
  if (role === "capture") {
    const relatif = formulaire.get("relatif");
    if (typeof relatif !== "string") return NextResponse.json({ erreur: "Case de capture manquante" }, { status: 400 });
    resultat = deposerCapture(id, relatif, octets);
  } else if (role === "musique") {
    resultat = deposerMusique(id, fichier.name, octets);
  } else if (role === "logo") {
    resultat = deposerLogo(id, fichier.name, octets);
  } else {
    return NextResponse.json({ erreur: "Type de fichier inconnu" }, { status: 400 });
  }
  if (!resultat.ok) return NextResponse.json({ erreur: resultat.raison }, { status: resultat.statut });
  return NextResponse.json({ ok: true });
}
