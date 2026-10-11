import { NextRequest, NextResponse } from "next/server";

import { creerFilm } from "@/lib/film-ecriture";
import { type ChoixDeDepart, ficheDeDepart, idDepuisNom, problemesDuChoix } from "@/lib/film-fiche-depart";

/**
 * POST /api/motion/film — crée un film à partir des choix de la fenêtre
 * « Nouveau film » (nom, langues, formats, style). L'id se déduit du nom.
 * 201 { id } ; 400 { erreurs } ; 409 si un film porte déjà ce nom.
 */
export async function POST(req: NextRequest) {
  let choix: Partial<ChoixDeDepart>;
  try {
    choix = await req.json();
  } catch {
    return NextResponse.json({ erreurs: ["Requête illisible"] }, { status: 400 });
  }
  const erreurs = problemesDuChoix(choix);
  if (erreurs.length > 0) return NextResponse.json({ erreurs }, { status: 400 });

  const valide = choix as ChoixDeDepart;
  const id = idDepuisNom(valide.nom);
  const resultat = creerFilm(id, ficheDeDepart(valide));
  if (!resultat.ok) return NextResponse.json({ erreurs: [resultat.raison] }, { status: resultat.statut });
  return NextResponse.json({ id }, { status: 201 });
}
