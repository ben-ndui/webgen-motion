import { NextRequest, NextResponse } from "next/server";

import { chargerProjet } from "@/lib/formats/format-loader";
import { getFormatPublicDir } from "@/lib/formats/format-store";
import { enregistrerLesParoles, etatDesParoles } from "@/lib/formats/karaoke-paroles";
import { outilsWhisper } from "@/lib/whisper";

/** Le projet, s'il est un karaoké lisible ; sinon la réponse d'erreur. */
function karaoke(id: string) {
  const projet = chargerProjet(id);
  if (!projet) return { erreur: NextResponse.json({ erreur: "Projet introuvable" }, { status: 404 }) };
  if (projet.etat === "invalide" || projet.fiche.format !== "karaoke") {
    return { erreur: NextResponse.json({ erreur: "Ce projet n'est pas un karaoké lisible." }, { status: 409 }) };
  }
  return { spec: projet.fiche.spec };
}

/** GET — le brouillon de whisper, le texte de l'artiste, le résumé des paroles calées, et whisper est-il là. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const lecture = karaoke(id);
  if ("erreur" in lecture) return lecture.erreur;
  const whisper = outilsWhisper();
  return NextResponse.json(
    { ...etatDesParoles(getFormatPublicDir(id), lecture.spec.paroles), whisper: whisper.ok ? { ok: true } : { ok: false, raison: whisper.raison } },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** PUT — { texte } : les paroles écrites par l'artiste, une ligne par ligne affichée. */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const lecture = karaoke(id);
  if ("erreur" in lecture) return lecture.erreur;
  let corps: { texte?: unknown };
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ erreur: "Requête illisible" }, { status: 400 });
  }
  if (typeof corps.texte !== "string") return NextResponse.json({ erreur: "texte attendu" }, { status: 400 });
  const resultat = enregistrerLesParoles(getFormatPublicDir(id), corps.texte);
  if (!resultat.ok) return NextResponse.json({ erreur: resultat.raison }, { status: 413 });
  return NextResponse.json({ ok: true });
}
