import { redirect } from "next/navigation";

import { isPublicWebRuntime } from "@/lib/server/desktop-guard";
import FormulaireNouvelleSerie from "./formulaire";

/**
 * Nouvelle série — page pleine dédiée (même raison que « Nouveau format » :
 * pas de popup, une vraie page). Un film est un projet local : jamais sur la
 * vitrine publique.
 */
export default function NouvelleSeriePage() {
  if (isPublicWebRuntime(process.env)) redirect("/download");
  return <FormulaireNouvelleSerie />;
}
