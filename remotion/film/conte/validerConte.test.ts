import { describe, expect, it } from "vitest";

import { PICTOS } from "../pictos";
import { CONTE } from "./ficheConte";
import type { ConteSpec } from "./spec";
import {
  SCENES,
  ecrireLeCompteur,
  mesuresDeLaChute,
  placeAuSol,
  placeEnOrbite,
  plansDuConte,
  valeurPendantLaChute,
} from "./trame";
import { PICTOS_DU_CONTE, erreursDuConte } from "./validerConte";

function copie(): ConteSpec {
  return JSON.parse(JSON.stringify(CONTE)) as ConteSpec;
}

describe("la fiche du conte", () => {
  it("accepte la fiche d'exemple, et garde la liste de pictos identique à pictos.ts", () => {
    expect(erreursDuConte(copie())).toEqual([]);
    expect(PICTOS_DU_CONTE).toEqual([...PICTOS]);
  });

  it("refuse un compteur qui ne s'écroule pas", () => {
    const spec = copie();
    spec.compteur.apres = spec.compteur.total;
    expect(erreursDuConte(spec)).toContain("compteur.apres : plus petit que le total, sinon rien ne s'écroule");
  });

  it("borne les objets à 3 à 8 et refuse un pictogramme inconnu", () => {
    const spec = copie();
    spec.objets = spec.objets.slice(0, 2);
    expect(erreursDuConte(spec)).toContain("objets : 3 à 8 objets");
    const inconnu = copie();
    inconnu.heros = { type: "picto", picto: "mammouth" as never };
    expect(erreursDuConte(inconnu).some((e) => e.startsWith("heros.picto"))).toBe(true);
  });

  it("exige autant d'avantages dans chaque langue (un plan par avantage)", () => {
    const spec = copie();
    spec.textes.en.avantages = spec.textes.en.avantages.slice(0, 2);
    expect(erreursDuConte(spec)).toContain("textes : autant d'avantages dans chaque langue");
  });

  it("exige chaque texte dans chaque langue", () => {
    const spec = copie();
    spec.textes.fr.sauf = " ";
    expect(erreursDuConte(spec)).toContain("textes.fr.sauf : texte non vide attendu");
  });
});

describe("la trame du conte", () => {
  it("laisse tomber tous les objets avant la fin de la chute", () => {
    for (let objets = 3; objets <= 8; objets += 1) {
      expect(mesuresDeLaChute(objets) * 4).toBeGreaterThan(1 + objets);
    }
  });

  it("pose les plans dans l'ordre, un par avantage, puis la fin", () => {
    expect(plansDuConte(copie(), "fr").map((p) => p.id)).toEqual([
      "avant", "chute", "constat", "sauf", "solution", "avantage-0", "avantage-1", "avantage-2", "fin",
    ]);
  });

  it("pose les objets de part et d'autre du héros, sans en mettre deux au même endroit", () => {
    for (const format of ["paysage", "portrait"] as const) {
      const places = Array.from({ length: 8 }, (_, i) => placeAuSol(i, format));
      expect(new Set(places.map((p) => `${p.x},${p.y}`)).size).toBe(8);
      for (const p of places) {
        expect(p.x - SCENES[format].objet / 2).toBeGreaterThanOrEqual(0);
        expect(p.x + SCENES[format].objet / 2).toBeLessThanOrEqual(SCENES[format].largeur);
      }
    }
  });

  it("garde l'orbite dans le cadre, dans les deux formats", () => {
    const hauteurs = { paysage: 1080, portrait: 1920 };
    for (const format of ["paysage", "portrait"] as const) {
      for (let tour = 0; tour < 1; tour += 0.05) {
        const p = placeEnOrbite(0, 6, tour, format);
        expect(p.y + SCENES[format].objet / 2).toBeLessThanOrEqual(hauteurs[format]);
        expect(p.x - SCENES[format].objet / 2).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("fait grimper le compteur jusqu'au total exact, au dernier objet", () => {
    expect(valeurPendantLaChute(113, 0, 6, 0)).toBe(0);
    expect(valeurPendantLaChute(113, 6, 6, 0)).toBe(113);
    expect(valeurPendantLaChute(17.96, 2, 4, 2)).toBe(8.98);
  });

  it("écrit le compteur dans la langue du film", () => {
    expect(ecrireLeCompteur(4.49, 2, "€/mois", "fr")).toBe("4,49 €/mois");
    expect(ecrireLeCompteur(4.49, 2, "€/month", "en")).toBe("4.49 €/month");
    expect(ecrireLeCompteur(113, 0, "offres", "fr")).toBe("113 offres");
  });
});
