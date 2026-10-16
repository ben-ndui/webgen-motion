// L'image (absolue, dans la vidéo) d'un temps d'un plan : « constat » + 3 temps.
// Le héros, la glace, les objets et le compteur vivent sur TOUTE la vidéo,
// hors des séquences : ils se règlent sur ces instants.
import type { PlanPlace } from "../lib/tempo";
import { imageDuTemps } from "../lib/tempo";

export type Instant = (plan: string, temps?: number) => number;

export function instantsDuConte(places: PlanPlace[], tempo: number): Instant {
  return (plan, temps = 0) => {
    const place = places.find((p) => p.id === plan);
    if (!place) throw new Error(`Plan inconnu du conte : « ${plan} »`);
    return place.debut + imageDuTemps(temps, tempo);
  };
}
