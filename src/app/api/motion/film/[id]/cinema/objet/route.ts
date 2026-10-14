import { NextRequest, NextResponse } from "next/server";

import { deposerLaPhotoDuProduit, retirerLaPhotoDuProduit } from "@/lib/cinema/photo-du-produit";
import { studioRequis } from "@/lib/cinema/reponse-http";

/**
 * POST   /api/motion/film/<id>/cinema/objet — dépose la photo du vrai produit (multipart, champ « fichier »).
 * DELETE /api/motion/film/<id>/cinema/objet — la retire.
 * Réponse : { photo: "cinema/objet.jpg" | null }, ou { erreur }.
 */
type Contexte = { params: Promise<{ id: string }> };

function enReponse(resultat: ReturnType<typeof retirerLaPhotoDuProduit>): NextResponse {
  if (!resultat.ok) return NextResponse.json({ erreur: resultat.raison }, { status: resultat.statut });
  return NextResponse.json({ photo: resultat.photo });
}

export async function POST(req: NextRequest, ctx: Contexte) {
  const porte = studioRequis();
  if (porte) return porte;
  const { id } = await ctx.params;
  let fichier: FormDataEntryValue | null;
  try {
    fichier = (await req.formData()).get("fichier");
  } catch {
    return NextResponse.json({ erreur: "Envoi illisible" }, { status: 400 });
  }
  if (!(fichier instanceof Blob)) return NextResponse.json({ erreur: "Aucune photo reçue" }, { status: 400 });
  return enReponse(deposerLaPhotoDuProduit(id, new Uint8Array(await fichier.arrayBuffer())));
}

export async function DELETE(_req: NextRequest, ctx: Contexte) {
  const porte = studioRequis();
  if (porte) return porte;
  const { id } = await ctx.params;
  return enReponse(retirerLaPhotoDuProduit(id));
}
