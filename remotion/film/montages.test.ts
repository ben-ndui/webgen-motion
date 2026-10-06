import { describe, expect, it } from "vitest";

import { FILM } from "./film";
import { IMAGES_PAR_SECONDE } from "./lib/tempo";
import { MONTAGES, type Version, dureeDuFilm } from "./montages";

const VERSIONS = Object.keys(MONTAGES) as Version[];
const TEMPO = FILM.musique.tempo;

function secondes(version: Version): number {
  return dureeDuFilm(version, TEMPO) / IMAGES_PAR_SECONDE;
}

describe("montages", () => {
  it.each(VERSIONS)("%s : chaque glissement vise un plan du montage", (version) => {
    // Un glissement vers un plan absent disparaîtrait sans erreur : la coupe
    // redeviendrait sèche sans que personne ne le voie.
    const plans = new Set(MONTAGES[version].plans.map((plan) => plan.id));
    for (const id of MONTAGES[version].glissements) {
      expect(plans.has(id)).toBe(true);
    }
  });

  it.each(VERSIONS)("%s : aucun plan n'apparaît deux fois", (version) => {
    const ids = MONTAGES[version].plans.map((plan) => plan.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(VERSIONS)("%s : ouvre sur la marque, enchaîne problème puis bascule, finit sur la fin", (version) => {
    const ids = MONTAGES[version].plans.map((plan) => plan.id);
    expect(ids.slice(0, 3)).toEqual(["ouverture", "probleme", "bascule"]);
    expect(ids[ids.length - 1]).toBe("fin");
  });

  it("le montage court garde le problème (public froid) et ne saute que la marque", () => {
    const long = MONTAGES.long.plans.map((plan) => plan.id);
    const court = new Set(MONTAGES.court.plans.map((plan) => plan.id));
    expect(long.filter((id) => !court.has(id))).toEqual(["marque"]);
  });

  it("le film long tient sous la minute", () => {
    expect(secondes("long")).toBeGreaterThan(30);
    expect(secondes("long")).toBeLessThanOrEqual(60);
  });

  it("le montage court tient sous 45 s", () => {
    expect(secondes("court")).toBeGreaterThan(20);
    expect(secondes("court")).toBeLessThanOrEqual(45);
  });
});
