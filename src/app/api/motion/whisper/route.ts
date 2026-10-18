import { NextResponse } from "next/server";

import { MODELES_WHISPER, modelePresent } from "@/lib/modeles-whisper";
import { outilsWhisper } from "@/lib/whisper";

/** GET /api/motion/whisper — whisper.cpp est-il là, et quels modèles sont téléchargés. */
export async function GET() {
  const outils = outilsWhisper();
  const sansModele = !outils.ok && /modèle/.test(outils.raison);
  return NextResponse.json(
    {
      // Le binaire est là si tout est prêt, ou s'il ne manque que le modèle.
      cli: outils.ok || sansModele,
      pret: outils.ok,
      raison: outils.ok ? null : outils.raison,
      modeles: Object.values(MODELES_WHISPER).map((m) => ({ nom: m.nom, libelle: m.libelle, octets: m.octets, present: modelePresent(m) })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
