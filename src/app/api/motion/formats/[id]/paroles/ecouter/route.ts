import { NextRequest, NextResponse } from "next/server";
import { join } from "node:path";

import { chargerProjet } from "@/lib/formats/format-loader";
import { getFormatPublicDir } from "@/lib/formats/format-store";
import { CHEMINS_DES_PAROLES } from "@/lib/formats/karaoke-paroles";
import { diffuserLeRendu } from "@/lib/rendu-en-flux";
import { resolveRunnerSpawn } from "@/lib/runner-spawn";
import { outilsWhisper } from "@/lib/whisper";

/** Une ligne du runner des paroles → un événement pour l'écran. */
function lireLigne(ligne: string): { type: string; label: string } | null {
  if (ligne.startsWith("▶ ") || ligne.startsWith("Écoute")) return { type: "phase", label: ligne.replace(/^▶ /, "") };
  if (ligne.startsWith("✓ ")) return { type: "phase", label: ligne.slice(2) };
  return null;
}

/**
 * POST /api/motion/formats/<id>/paroles/ecouter — { etape: "brouillon" | "calage", langue } :
 * whisper écoute le morceau EN LOCAL (scripts/caler-paroles.ts) ; progression en NDJSON,
 * même contrat que les rendus. Le calage prend 2 à 3 minutes pour un morceau entier.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let corps: { etape?: unknown; langue?: unknown };
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête illisible" }, { status: 400 });
  }
  const etape = corps.etape === "brouillon" || corps.etape === "calage" ? corps.etape : null;
  const langue = typeof corps.langue === "string" && /^[a-z]{2}$|^auto$/.test(corps.langue) ? corps.langue : "fr";
  if (!etape) return NextResponse.json({ error: "etape : brouillon ou calage" }, { status: 400 });
  const projet = chargerProjet(id);
  if (!projet || projet.etat === "invalide" || projet.fiche.format !== "karaoke") {
    return NextResponse.json({ error: "Ce projet n'est pas un karaoké lisible." }, { status: 404 });
  }
  const whisper = outilsWhisper();
  if (!whisper.ok) return NextResponse.json({ error: whisper.raison }, { status: 412 });
  const sortie = join(getFormatPublicDir(id), etape === "brouillon" ? CHEMINS_DES_PAROLES.brouillon : projet.fiche.spec.paroles);
  return diffuserLeRendu({
    spawnSpec: resolveRunnerSpawn("caler-paroles", ["--id", id, "--etape", etape, "--langue", langue]),
    sortie,
    journal: "caler-paroles",
    quoi: etape === "brouillon" ? "L'écoute" : "Le calage",
    lireLigne,
    poidsMinimum: 2,
    termine: () => ({ id, etape }),
  });
}
