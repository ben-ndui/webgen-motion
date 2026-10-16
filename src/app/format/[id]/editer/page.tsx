import { notFound } from "next/navigation";

import "../../../film/[id]/creer/assistant.css";
import { type FicheDeFormat, CATALOGUE, erreursDuProjet, estNomDeFormat } from "@/lib/formats/catalogue";
import { lireProjetBrut } from "@/lib/formats/format-loader";
import { textesAEcrire } from "@/lib/formats/textes-a-ecrire";
import { isPublicWebRuntime } from "@/lib/server/desktop-guard";
import CadreDuFormat from "../_components/cadre-du-format";
import EditeurDuFormat from "./_components/editeur-du-format";

/**
 * L'éditeur d'un projet de format. SERVEUR pour la première lecture (le
 * disque), puis le composant client enregistre tout seul. Un projet qu'on ne
 * sait pas lire renvoie à sa page, qui affiche ses erreurs.
 */
export const dynamic = "force-dynamic";

export default async function EditerUnFormat({ params }: { params: Promise<{ id: string }> }) {
  if (isPublicWebRuntime(process.env)) notFound();
  const { id } = await params;
  const brut = lireProjetBrut(id) as { format?: unknown } | null;
  if (!brut || !estNomDeFormat(brut.format)) notFound();
  const projet = brut as FicheDeFormat;
  let aEcrire: string[] = [];
  try {
    aEcrire = textesAEcrire(projet).map((t) => t.chemin);
  } catch {
    // Trop incomplet pour être lu : les erreurs le disent.
  }
  return (
    <CadreDuFormat nom={id} kicker={`${CATALOGUE[projet.format].libelle} · formats/${id}.json`} titre={`Modifier ${id}`}
      sousTitre="Tout s'enregistre tout seul. Les textes de l'exemple s'affichent en gris : écris les tiens à leur place.">
      <EditeurDuFormat id={id} initial={{ projet, erreurs: erreursDuProjet(projet), aEcrire }} />
    </CadreDuFormat>
  );
}
