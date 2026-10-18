import { NextRequest, NextResponse } from "next/server";

import { idDepuisNom } from "@/lib/film-fiche-depart";
import { CATALOGUE, FORMATS, estNomDeFormat } from "@/lib/formats/catalogue";
import { creerProjet, listerProjets, projetDeDepart } from "@/lib/formats/format-loader";

/** GET /api/motion/formats — le catalogue, et les projets (invalides compris, avec leurs erreurs). */
export async function GET() {
  const catalogue = FORMATS.map((nom) => {
    const { libelle, pourQui, description } = CATALOGUE[nom];
    return { nom, libelle, pourQui, description };
  });
  const projets = listerProjets().map((projet) =>
    projet.etat === "valide"
      ? { id: projet.id, etat: projet.etat, format: projet.fiche.format, exemple: projet.fiche.spec.exemple }
      : { id: projet.id, etat: projet.etat, format: projet.format, erreurs: projet.erreurs },
  );
  return NextResponse.json({ catalogue, projets }, { headers: { "Cache-Control": "no-store" } });
}

/**
 * POST /api/motion/formats — { format, nom } : crée un projet à partir de la
 * fiche d'exemple du format. 201 { id } ; 400 { erreurs } ; 409 si le nom est pris.
 */
export async function POST(req: NextRequest) {
  let corps: { format?: unknown; nom?: unknown };
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ erreurs: ["Requête illisible"] }, { status: 400 });
  }
  const erreurs: string[] = [];
  if (!estNomDeFormat(corps.format)) erreurs.push(`format : l'un de ${FORMATS.join(", ")}`);
  const id = typeof corps.nom === "string" ? idDepuisNom(corps.nom) : "";
  if (id.length < 2) erreurs.push("nom : au moins deux lettres ou chiffres");
  if (erreurs.length > 0 || !estNomDeFormat(corps.format)) return NextResponse.json({ erreurs }, { status: 400 });

  const resultat = creerProjet(id, projetDeDepart(corps.format, id));
  if (!resultat.ok) return NextResponse.json({ erreurs: [resultat.raison] }, { status: resultat.statut });
  return NextResponse.json({ id }, { status: 201 });
}
