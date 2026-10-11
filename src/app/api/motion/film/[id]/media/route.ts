import { NextRequest, NextResponse } from "next/server";

import { readFileSync } from "node:fs";

import { deposerCapture, deposerLogo, deposerMusique, deposerMusiqueDeLaBibliotheque } from "@/lib/film-depot";
import { cheminDUnMediaAttendu } from "@/lib/film-depot-lecture";

const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", svg: "image/svg+xml" };

/**
 * GET /api/motion/film/<id>/media?relatif=… — l'aperçu d'une image déposée,
 * pour la vignette de sa case. Seuls les médias ATTENDUS par la fiche se
 * lisent : aucun chemin arbitraire du disque.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const relatif = req.nextUrl.searchParams.get("relatif") ?? "";
  const chemin = cheminDUnMediaAttendu(id, relatif);
  const extension = relatif.split(".").pop()?.toLowerCase() ?? "";
  if (!chemin || !TYPES[extension]) return NextResponse.json({ erreur: "Média introuvable" }, { status: 404 });
  // Un SVG déposé pourrait porter du script : servi en image, sans exécution.
  return new NextResponse(readFileSync(chemin), {
    headers: { "Content-Type": TYPES[extension], "Cache-Control": "no-store", "Content-Security-Policy": "script-src 'none'; sandbox" },
  });
}

/**
 * POST /api/motion/film/<id>/media — dépose un fichier (multipart) :
 *   role = « capture » (+ relatif : la case attendue), « musique » ou « logo »,
 *   fichier = le fichier.
 * Le serveur range, renomme et mesure : la personne n'a rien à nommer.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let formulaire: FormData;
  try {
    formulaire = await req.formData();
  } catch {
    return NextResponse.json({ erreur: "Envoi illisible" }, { status: 400 });
  }
  const role = formulaire.get("role");
  // Un morceau de la bibliothèque : pas de fichier envoyé, juste son identifiant.
  if (role === "bibliotheque") {
    const morceau = formulaire.get("morceau");
    if (typeof morceau !== "string") return NextResponse.json({ erreur: "Morceau manquant" }, { status: 400 });
    const resultat = deposerMusiqueDeLaBibliotheque(id, morceau);
    if (!resultat.ok) return NextResponse.json({ erreur: resultat.raison }, { status: resultat.statut });
    return NextResponse.json({ ok: true });
  }
  const fichier = formulaire.get("fichier");
  if (!(fichier instanceof File)) return NextResponse.json({ erreur: "Aucun fichier reçu" }, { status: 400 });
  const octets = new Uint8Array(await fichier.arrayBuffer());

  let resultat;
  if (role === "capture") {
    const relatif = formulaire.get("relatif");
    if (typeof relatif !== "string") return NextResponse.json({ erreur: "Case de capture manquante" }, { status: 400 });
    resultat = deposerCapture(id, relatif, octets);
  } else if (role === "musique") {
    resultat = deposerMusique(id, fichier.name, octets);
  } else if (role === "logo") {
    resultat = deposerLogo(id, fichier.name, octets);
  } else {
    return NextResponse.json({ erreur: "Type de fichier inconnu" }, { status: 400 });
  }
  if (!resultat.ok) return NextResponse.json({ erreur: resultat.raison }, { status: resultat.statut });
  return NextResponse.json({ ok: true });
}
