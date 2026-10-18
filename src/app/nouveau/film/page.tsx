import { redirect } from "next/navigation";

import { isPublicWebRuntime } from "@/lib/server/desktop-guard";
import FormulaireNouveauFilm from "./formulaire";

/**
 * Cette page écrit sur le disque de l'app locale : sur la vitrine (Vercel),
 * le formulaire validerait pour tomber sur un 403 trompeur ("fenêtre non
 * reconnue"), comme /dashboard et /film/[id]/creer.
 */
export default function NouveauFilmPage() {
  if (isPublicWebRuntime(process.env)) redirect("/download");
  return <FormulaireNouveauFilm />;
}
