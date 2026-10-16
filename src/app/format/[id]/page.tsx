import { notFound } from "next/navigation";

import { isFeatureEnabled } from "@/lib/edition";
import { CATALOGUE } from "@/lib/formats/catalogue";
import { resumerProjet } from "@/lib/formats/format-etat";
import { chargerProjet } from "@/lib/formats/format-loader";
import { isPublicWebRuntime } from "@/lib/server/desktop-guard";
import FormatVue from "./_components/format-vue";

/**
 * Page d'un projet de format (explainer, conte, karaoké). Composant SERVEUR :
 * le projet, ses médias et ses rendus se lisent sur le disque, puis passent en
 * props. Toujours dynamique (l'état dépend de ~/.webgen-motion), jamais sur la
 * vitrine publique (projets de la personne, chemins de la machine).
 */
export const dynamic = "force-dynamic";

export default async function FormatPage({ params }: { params: Promise<{ id: string }> }) {
  if (isPublicWebRuntime(process.env)) notFound();
  const { id } = await params;
  const projet = chargerProjet(id);
  const resume = projet ? resumerProjet(projet) : null;
  const pourQui = resume?.format ? CATALOGUE[resume.format].pourQui : null;
  return <FormatVue id={id} resume={resume} pourQui={pourQui} studio={isFeatureEnabled("film-de-marque")} />;
}
