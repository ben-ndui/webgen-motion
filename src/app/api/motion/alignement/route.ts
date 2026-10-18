import { NextResponse } from "next/server";

import { alignementPossibleIci, cheminDuModeleDAlignement } from "@/lib/karaoke-alignement/emplacement-du-modele";
import { installationEnCours } from "@/lib/karaoke-alignement/installation-en-cours";
import { MODELE_FRANCAIS } from "@/lib/karaoke-alignement/modele-francais";

/**
 * GET /api/motion/alignement — le calage mot à mot peut-il tourner sur ce Mac,
 * son modèle est-il installé (entier), et son installation est-elle en cours ?
 */
export async function GET() {
  return NextResponse.json(
    {
      disponible: alignementPossibleIci(),
      present: cheminDuModeleDAlignement("fr") !== null,
      enCours: installationEnCours(),
      octets: MODELE_FRANCAIS.octets,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
