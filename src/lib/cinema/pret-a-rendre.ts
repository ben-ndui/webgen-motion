import { existsSync } from "node:fs";
import { join } from "node:path";

import type { FilmSpec } from "../../../remotion/film/spec";

export const MESSAGE_SANS_SERIE = "la fiche n'a pas de série : aucun épisode à rendre";

/**
 * Ce qui empêche de rendre UN épisode, en phrases ; vide = rendable. Chaque
 * plan de l'épisode doit avoir sa vidéo SUR LE DISQUE (pas seulement citée
 * par la fiche) ; un autre épisode pas fini ne bloque pas celui-ci.
 * SERVEUR SEULEMENT.
 */
export function problemesDeLEpisode(spec: FilmSpec, episodeId: string | undefined, dossierPublic: string): string[] {
  if (!spec.cinema) return [MESSAGE_SANS_SERIE];
  const episode = spec.cinema.episodes.find((e) => e.id === episodeId);
  if (!episode) return [`épisode « ${episodeId ?? ""} » introuvable dans la série`];
  const problemes = problemesDeLaFin(spec, dossierPublic);
  episode.scenes.forEach((scene, indexDeScene) => {
    scene.plans.forEach((plan, indexDePlan) => {
      const nom = `scène ${indexDeScene + 1}, plan ${indexDePlan + 1}`;
      if (!plan.fichier) problemes.push(`${nom} : pas encore généré`);
      else if (!existsSync(join(dossierPublic, plan.fichier))) problemes.push(`${nom} : vidéo absente du disque (${plan.fichier})`);
    });
  });
  return problemes;
}

/** Un carton de fin vide, ou dont le logo cité manque : l'épisode finirait sur un écran noir. */
function problemesDeLaFin(spec: FilmSpec, dossierPublic: string): string[] {
  const fin = spec.cinema?.fin;
  if (fin?.type !== "carton") return [];
  if (fin.texte.trim() === "" && !fin.logo) return ["carton de fin vide : écris son texte ou dépose le logo du studio"];
  if (fin.logo && !existsSync(join(dossierPublic, fin.logo))) return [`logo du carton de fin absent du disque (${fin.logo})`];
  return [];
}
