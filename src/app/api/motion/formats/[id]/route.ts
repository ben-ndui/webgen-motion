import { NextRequest, NextResponse } from "next/server";

import { type FicheDeFormat, erreursDuProjet } from "@/lib/formats/catalogue";
import { textesAEcrire } from "@/lib/formats/textes-a-ecrire";
import { enregistrerProjet, lireProjetBrut } from "@/lib/formats/format-loader";

/** Ce que l'éditeur relit après chaque enregistrement : le projet, ses erreurs, et ses textes encore à écrire. */
function etatDuProjet(projet: unknown) {
  const erreurs = erreursDuProjet(projet);
  let aEcrire: string[] = [];
  try {
    aEcrire = textesAEcrire(projet as FicheDeFormat).map((t) => t.chemin);
  } catch {
    // Projet trop incomplet pour être lu : ses erreurs le disent déjà.
  }
  return { projet, erreurs, aEcrire };
}

/** GET /api/motion/formats/<id> — le projet brut (même invalide), ses erreurs et ses textes à écrire. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projet = lireProjetBrut(id);
  if (projet === null) return NextResponse.json({ erreur: "Projet introuvable" }, { status: 404 });
  return NextResponse.json(etatDuProjet(projet), { headers: { "Cache-Control": "no-store" } });
}

/** PUT /api/motion/formats/<id> — { projet } : enregistré même incomplet, la réponse liste ses erreurs. */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let corps: { projet?: unknown };
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ erreur: "Requête illisible" }, { status: 400 });
  }
  const resultat = enregistrerProjet(id, corps?.projet);
  if (!resultat.ok) return NextResponse.json({ erreur: resultat.raison }, { status: resultat.statut });
  return NextResponse.json(etatDuProjet(lireProjetBrut(id)));
}
