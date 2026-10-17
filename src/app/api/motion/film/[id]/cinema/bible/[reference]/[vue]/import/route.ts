import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { estUneVue } from "@/lib/cinema/bible/etat";
import { importerUneImageDeLaBible } from "@/lib/cinema/bible/generation";
import { studioRequis } from "@/lib/cinema/reponse-http";

/**
 * POST /api/motion/film/<id>/cinema/bible/<reference>/<vue>/import — dépose
 * une image existante comme nouvelle version (multipart, champ « fichier »,
 * « droits » = "oui" si la personne a déclaré en détenir les droits).
 * Ne compte pas dans le budget d'images (seules les générations sont payées).
 * Réponse : { fichier } comme la génération.
 */
type Contexte = { params: Promise<{ id: string; reference: string; vue: string }> };

export async function POST(req: NextRequest, ctx: Contexte) {
  const porte = studioRequis();
  if (porte) return porte;
  const { id, reference, vue } = await ctx.params;
  if (!estUneVue(vue)) return NextResponse.json({ erreur: `Vue inconnue : « ${vue} »` }, { status: 400 });
  let donnees: FormData;
  try {
    donnees = await req.formData();
  } catch {
    return NextResponse.json({ erreur: "Envoi illisible" }, { status: 400 });
  }
  const fichier = donnees.get("fichier");
  if (!(fichier instanceof Blob)) return NextResponse.json({ erreur: "Aucune image reçue" }, { status: 400 });
  const droitsDeclares = donnees.get("droits") === "oui";
  const resultat = importerUneImageDeLaBible(id, reference, vue, new Uint8Array(await fichier.arrayBuffer()), droitsDeclares);
  if (!resultat.ok) return NextResponse.json({ erreur: resultat.raison }, { status: resultat.statut });
  return NextResponse.json({ fichier: resultat.fichier }, { headers: { "Cache-Control": "no-store" } });
}
