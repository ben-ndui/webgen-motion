import { NextResponse } from "next/server";

import { diffuserUnTelechargement } from "@/lib/flux-de-telechargement";
import { alignementPossibleIci, cheminDuModeleDAlignement, dossierDesModelesDAlignement } from "@/lib/karaoke-alignement/emplacement-du-modele";
import { installationEnCours, marquerLInstallation } from "@/lib/karaoke-alignement/installation-en-cours";
import { MODELE_FRANCAIS } from "@/lib/karaoke-alignement/modele-francais";
import { telechargerUnModele } from "@/lib/modeles-whisper";

/**
 * POST /api/motion/alignement/telecharger : télécharge le modèle d'alignement
 * français (356 Mo) depuis son adresse épinglée, vérifie taille et empreinte,
 * et diffuse la progression en NDJSON. Un seul téléchargement à la fois (409) ;
 * rien sur une machine où il ne pourrait pas tourner (422).
 */
export async function POST() {
  if (!alignementPossibleIci()) return NextResponse.json({ error: "Le calage mot à mot ne tourne pas sur ce Mac (processeur Intel)." }, { status: 422 });
  // Déjà là, entier : rien à re-télécharger (356 Mo).
  const deja = cheminDuModeleDAlignement("fr");
  if (deja) return diffuserUnTelechargement(async () => ({ ok: true, chemin: deja }));
  if (installationEnCours()) return NextResponse.json({ error: "L'installation est déjà en cours." }, { status: 409 });
  marquerLInstallation(true);
  return diffuserUnTelechargement(
    (surProgression) => telechargerUnModele(MODELE_FRANCAIS, surProgression, { dossier: dossierDesModelesDAlignement() }),
    () => marquerLInstallation(false),
  );
}
