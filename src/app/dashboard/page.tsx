import { existsSync } from "node:fs";
import { join } from "node:path";
import { redirect } from "next/navigation";
import "../hub.css";
import { getAllTours } from "@/lib/tour-loader";
import { getCategory } from "@/lib/motion-categories";
import { formatDuration } from "@/lib/format-duration";
import { getMotionTourDir } from "@/lib/motion-tour-store";
import { resolveEdition } from "@/lib/edition";
import { lireLEtatDesReglages } from "@/lib/reglages/lire-l-etat-des-reglages";
import { listerFilms } from "@/lib/film-loader";
import { resumerFilm } from "@/lib/film-etat";
import { isPublicWebRuntime } from "@/lib/server/desktop-guard";
import HubApp, { type HubTour } from "../_components/hub-app";
import type { HubFilm } from "../_components/hub-films";
import type { HubFormat } from "../_components/hub-formats";
import { resumerProjet } from "@/lib/formats/format-etat";
import { listerProjets } from "@/lib/formats/format-loader";

/**
 * Hub / Dashboard — Phase 4 portage (handoff: GEN MOTION Hub.html).
 * Server component: loads real tours + derives each tour's status from
 * on-disk artifacts, then hands off to the client <HubApp> for the
 * sidebar shell + live filters. Status is storage-derived so it reflects
 * reality (force-dynamic — depends on ~/.webgen-motion contents).
 */
export const dynamic = "force-dynamic";

function statusFor(id: string): HubTour["status"] {
  const dir = getMotionTourDir(id);
  if (existsSync(join(dir, "final.mp4"))) return "rendered";
  if (existsSync(join(dir, "manifest.json"))) return "ready";
  return "draft";
}

// Les films de marque, statut tiré du disque. Une lecture ratée du dossier
// remonte comme une ERREUR à l'écran, jamais comme « aucun film ».
function filmsDuHub(): { films: HubFilm[] | null; error: string | null } {
  try {
    const films = listerFilms().map((fiche) => {
      const resume = resumerFilm(fiche);
      return {
        id: resume.id,
        nom: resume.nom,
        statut: resume.statut,
        langues: resume.langues,
        declinaisons: resume.declinaisons.length,
        rendus: resume.rendus,
        erreurs: resume.erreurs.length,
        // Le premier rendu sert de vignette ; sans rendu, le format de la première déclinaison.
        apercu: {
          video: resume.declinaisons.find((d) => d.rendu)?.rendu?.url ?? null,
          portrait: (resume.declinaisons.find((d) => d.rendu) ?? resume.declinaisons[0])?.version === "court",
        },
      };
    });
    return { films, error: null };
  } catch (erreur) {
    return { films: [], error: (erreur as Error).message };
  }
}

// Les projets de format, même règle que les films : une lecture ratée est une
// ERREUR à l'écran ; sur la vitrine publique, pas de section (`null`). Le
// catalogue proposé à la création vit dans /nouveau/format (son propre fetch).
function formatsDuHub(): { projets: HubFormat[] | null; error: string | null } {
  if (isPublicWebRuntime(process.env)) return { projets: null, error: null };
  try {
    const projets = listerProjets().map((projet) => {
      const resume = resumerProjet(projet);
      const rendue = resume.declinaisons.find((d) => d.rendu);
      return {
        id: resume.id,
        libelle: resume.libelle,
        statut: resume.statut,
        erreurs: resume.erreurs.length,
        apercu: { video: rendue?.rendu?.url ?? null, portrait: (rendue ?? resume.declinaisons[0])?.version === "court" },
      };
    });
    return { projets, error: null };
  } catch (erreur) {
    return { projets: [], error: (erreur as Error).message };
  }
}

export default function DashboardPage() {
  // Le hub lit et écrit ~/.webgen-motion : il n'existe que dans l'app locale.
  // Sur la vitrine (Vercel), ce dossier ne peut pas être créé et la page
  // tombait en 500 ; le visiteur est envoyé vers le téléchargement de l'app.
  if (isPublicWebRuntime(process.env)) redirect("/download");

  const tours = getAllTours();
  const edition = resolveEdition().edition;
  const reglages = lireLEtatDesReglages();

  const cards: HubTour[] = tours.map((t) => {
    const firstSection = t.steps.find((s) => s.type === "section");
    const cat =
      getCategory(
        firstSection && "categoryId" in firstSection
          ? firstSection.categoryId
          : undefined,
      )?.label ?? "Tour";
    return {
      id: t.id,
      name: t.name,
      fmt: t.format === "9:16" ? "9:16" : "16:9",
      steps: t.steps.length,
      dur: formatDuration(t.estimatedSec),
      cat,
      status: statusFor(t.id),
    };
  });

  const { films, error } = filmsDuHub();
  const formats = formatsDuHub();

  return (
    <HubApp tours={cards} edition={edition} reglages={reglages} films={films} filmsError={error} formats={formats} />
  );
}
