import { NextRequest, NextResponse } from "next/server";

import { resolveAgent } from "@/lib/config-resolve";
import { ecrireLExplainer } from "@/lib/formats/ecrire-l-explainer";
import { chargerProjet } from "@/lib/formats/format-loader";

/**
 * POST /api/motion/formats/<id>/ecrire — { sujet, notes } : Claude propose les
 * scènes et les textes FR/EN d'un explainer, à partir des seuls faits des
 * notes. Rien n'est enregistré : l'éditeur montre la proposition, la personne
 * la garde ou non. 200 { proposition } ; 400/404/409/412/502 { erreur }.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let corps: { sujet?: unknown; notes?: unknown };
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ erreur: "Requête illisible" }, { status: 400 });
  }
  const projet = chargerProjet(id);
  if (!projet) return NextResponse.json({ erreur: "Projet introuvable" }, { status: 404 });
  if (projet.etat === "invalide") return NextResponse.json({ erreur: "Le projet a des erreurs : corrige-les d'abord." }, { status: 409 });
  if (projet.fiche.format !== "explainer") return NextResponse.json({ erreur: "Claude écrit pour l'instant les explainers." }, { status: 400 });
  const sujet = typeof corps.sujet === "string" ? corps.sujet : "";
  const notes = typeof corps.notes === "string" ? corps.notes : "";
  const reponse = await ecrireLExplainer(projet.fiche.spec, sujet, notes, resolveAgent());
  if (!reponse.ok) return NextResponse.json({ erreur: reponse.raison }, { status: reponse.statut });
  return NextResponse.json({ proposition: reponse.proposition });
}
