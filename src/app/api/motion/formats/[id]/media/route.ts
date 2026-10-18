import { NextRequest, NextResponse } from "next/server";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { CATALOGUE, type FicheDeFormat } from "@/lib/formats/catalogue";
import { chargerProjet } from "@/lib/formats/format-loader";
import { getFormatPublicDir } from "@/lib/formats/format-store";
import { reponseVideo } from "@/lib/servir-une-video";

import { deposerMusiqueDuFormat } from "@/lib/formats/format-depot";

/**
 * GET /api/motion/formats/<id>/media?relatif=… — l'aperçu d'une vidéo du décor
 * sur mesure. Seuls les fichiers ATTENDUS par le projet se lisent : aucun
 * chemin arbitraire du disque.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const relatif = req.nextUrl.searchParams.get("relatif") ?? "";
  const projet = chargerProjet(id);
  if (!projet || projet.etat === "invalide" || !relatif.startsWith("fond/") || !relatif.endsWith(".mp4")) {
    return NextResponse.json({ erreur: "Média introuvable" }, { status: 404 });
  }
  const attendus = (CATALOGUE[projet.fiche.format].mediasAttendus as (s: FicheDeFormat["spec"]) => string[])(projet.fiche.spec);
  const chemin = join(getFormatPublicDir(id), relatif);
  if (!attendus.includes(relatif) || !existsSync(chemin)) return NextResponse.json({ erreur: "Média introuvable" }, { status: 404 });
  return reponseVideo(req, chemin);
}

/**
 * POST /api/motion/formats/<id>/media — dépose la musique du projet (multipart,
 * champ `fichier`) : la musique de fond d'un explainer ou d'un conte, ou le
 * morceau d'un karaoké. Le serveur la range, la renomme et la mesure.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let formulaire: FormData;
  try {
    formulaire = await req.formData();
  } catch {
    return NextResponse.json({ erreur: "Envoi illisible" }, { status: 400 });
  }
  const fichier = formulaire.get("fichier");
  if (!(fichier instanceof File)) return NextResponse.json({ erreur: "Aucun fichier reçu" }, { status: 400 });
  const resultat = deposerMusiqueDuFormat(id, fichier.name, new Uint8Array(await fichier.arrayBuffer()));
  if (!resultat.ok) return NextResponse.json({ erreur: resultat.raison }, { status: resultat.statut });
  return NextResponse.json({ ok: true });
}
