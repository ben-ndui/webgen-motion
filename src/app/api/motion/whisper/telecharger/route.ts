import { NextRequest, NextResponse } from "next/server";

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

  const encodeur = new TextEncoder();
  const flux = new ReadableStream({
    async start(controller) {
      const emettre = (evenement: Record<string, unknown>) => {
        try {
          controller.enqueue(encodeur.encode(`${JSON.stringify(evenement)}\n`));
        } catch {}
      };
      // Une ligne tous les 1 % : assez pour une barre fluide, sans noyer l'écran de 1,5 Go de messages.
      let dernierPourcent = -1;
      const resultat = await telechargerUnModele(modele, (recus, total) => {
        const pourcent = Math.floor((recus / total) * 100);
        if (pourcent !== dernierPourcent) {
          dernierPourcent = pourcent;
          emettre({ type: "progress", recus, total });
        }
      });
      enCours = false;
      emettre(resultat.ok ? { type: "done", ok: true } : { type: "error", message: resultat.raison });
      try {
        controller.close();
      } catch {}
    },
  });
  return new Response(flux, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
}
