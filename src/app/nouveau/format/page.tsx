import { redirect } from "next/navigation";

import { isPublicWebRuntime } from "@/lib/server/desktop-guard";
import { formatsProposables } from "@/lib/formats/catalogue";
import FormulaireNouveauFormat from "./formulaire";

/**
 * Nouveau format — page pleine (plus un popup : porte orpheline de 3 boutons
 * « Nouveau » dans le dashboard, corrigée le 18/10/2026). Le catalogue est
 * statique : lu côté serveur, le formulaire est le seul bout client.
 */
export default function NouveauFormatPage() {
  // Cette page écrit sur le disque de l'app locale : sur la vitrine (Vercel),
  // le formulaire validerait pour tomber sur un 403 trompeur ("fenêtre non
  // reconnue"), comme /dashboard et /film/[id]/creer.
  if (isPublicWebRuntime(process.env)) redirect("/download");
  return <FormulaireNouveauFormat formats={formatsProposables()} />;
}
