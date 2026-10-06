import { notFound } from "next/navigation";

import { chargerFilm } from "@/lib/film-loader";
import { isPublicWebRuntime } from "@/lib/server/desktop-guard";
import { resumerFilm } from "@/lib/film-etat";
import FilmVue from "./_components/film-vue";

/**
 * Page d'un film de marque. Composant SERVEUR : la fiche, les médias et les
 * rendus se lisent sur le disque (film-loader / film-etat sont réservés au
 * serveur, comme tour-loader) puis passent en props aux composants.
 * Toujours dynamique : l'état dépend de ~/.webgen-motion.
 *
 * Jamais sur la vitrine publique (Vercel) : les fiches de films sont des
 * projets clients et la page expose des chemins de la machine.
 */
export const dynamic = "force-dynamic";

export default async function FilmPage({ params }: { params: Promise<{ id: string }> }) {
  if (isPublicWebRuntime(process.env)) notFound();
  const { id } = await params;
  const fiche = chargerFilm(id);
  return <FilmVue id={id} resume={fiche ? resumerFilm(fiche) : null} />;
}
