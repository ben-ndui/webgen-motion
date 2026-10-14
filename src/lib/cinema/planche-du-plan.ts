import { join } from "node:path";

import { fabriquerLaPlanche } from "./decoupe";
import { LIEUX_PAR_DEFAUT, type Lieux, type Refus, ficheAvecCinema } from "./lieux";
import { trouverLePlan } from "./plans";

/**
 * Le chemin de la planche contact d'un plan généré, fabriquée au besoin. Seule
 * la vidéo CITÉE par le plan est lue ; la planche vit hors de public/ (elle ne
 * part jamais dans un rendu). SERVEUR SEULEMENT.
 */
export function plancheDuPlan(id: string, planId: string, partiel: Partial<Lieux> = {}): { ok: true; chemin: string } | Refus {
  const lieux: Lieux = { ...LIEUX_PAR_DEFAUT, ...partiel };
  const lecture = ficheAvecCinema(id, lieux);
  if (!lecture.ok) return lecture;
  const situe = trouverLePlan(lecture.cinema, planId);
  if (!situe) return { ok: false, statut: 404, raison: `Le plan « ${planId} » n'existe pas dans ce film.` };
  if (!situe.plan.fichier) return { ok: false, statut: 404, raison: "Ce plan n'est pas encore généré." };
  const chemin = join(lieux.dossier(id), "planches", `${planId}.png`);
  if (!fabriquerLaPlanche(join(lieux.public(id), situe.plan.fichier), chemin)) {
    return { ok: false, statut: 409, raison: "La vidéo du plan est absente ou illisible." };
  }
  return { ok: true, chemin };
}
