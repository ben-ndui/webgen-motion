import { existsSync } from "node:fs";
import { join } from "node:path";
import "../hub.css";
import { getAllTours } from "@/lib/tour-loader";
import { getCategory } from "@/lib/motion-categories";
import { formatDuration } from "@/lib/format-duration";
import { getMotionTourDir } from "@/lib/motion-tour-store";
import { resolveEdition } from "@/lib/edition";
import HubApp, { type HubTour } from "../_components/hub-app";

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

export default function DashboardPage() {
  const tours = getAllTours();
  const edition = resolveEdition().edition;

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

  return <HubApp tours={cards} edition={edition} />;
}
