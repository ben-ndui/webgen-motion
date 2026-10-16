import { NextRequest, NextResponse } from "next/server";

import { deposerMusiqueDuFormat } from "@/lib/formats/format-depot";

/**
 * POST /api/motion/formats/<id>/media — dépose la musique du projet (multipart,
 * champ `fichier`) : la musique de fond d'un explainer ou d'un conte, ou le
 * morceau d'un karaoké. Le serveur la range, la renomme et la mesure.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let formulaire: FormData;
  try {
    formulaire = await req.formData();
  } catch {
    return NextResponse.json({ erreur: "Envoi illisible" }, { status: 400 });
  }
  const fichier = formulaire.get("fichier");
  if (!(fichier instanceof File)) return NextResponse.json({ erreur: "Aucun fichier reçu" }, { status: 400 });
  const resultat = deposerMusiqueDuFormat(id, fichier.name, new Uint8Array(await fichier.arrayBuffer()));
  if (!resultat.ok) return NextResponse.json({ erreur: resultat.raison }, { status: resultat.statut });
  return NextResponse.json({ ok: true });
}
