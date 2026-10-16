import { useMemo } from "react";
import { useRouter } from "next/navigation";

import type { TourEntry } from "@/lib/types/tour";
import type { HubActionHandlers } from "../../tour/[id]/_components/console/useConsoleSession";

/** Ce que la console peut faire sur le tableau de bord : créer un tour, en ouvrir un. */
export function useActionsDuHub(): HubActionHandlers {
  const router = useRouter();
  return useMemo<HubActionHandlers>(
    () => ({
      // Même route que « Nouveau tour » ; on vérifie d'abord qu'il n'existe pas.
      createTour: async (tour: TourEntry) => {
        const adresse = `/api/motion/tour/${encodeURIComponent(tour.id)}`;
        try {
          const existant = await fetch(adresse);
          if (existant.ok) return { ok: false, error: `un tour "${tour.id}" existe déjà` };
          const reponse = await fetch(adresse, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tour }),
          });
          const donnees = (await reponse.json().catch(() => ({}))) as { ok?: boolean; error?: string };
          if (!reponse.ok || !donnees.ok) return { ok: false, error: donnees.error ?? `HTTP ${reponse.status}` };
          router.refresh(); // la grille montre le nouveau tour
          return { ok: true };
        } catch (e) {
          return { ok: false, error: (e as Error).message };
        }
      },
      openTour: (tourId: string) => {
        router.push(`/tour/${encodeURIComponent(tourId)}`);
      },
    }),
    [router],
  );
}
