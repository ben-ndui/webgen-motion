import { describe, expect, it } from "vitest";

import { hauteurDuTelephone } from "../composants/CadreTelephone";
import { MISE_EN_PAGE_DE_L_EVENTAIL } from "./PEventail";
import {
  SEPARATEUR_ANNEAU,
  bordsDeLEventail,
  caracteresDeLAnneau,
  caracteresPourLePerimetre,
  caracteresTapes,
  decouperLeMot,
  lettreDeFace,
  placesDansLEventail,
  rayonPourLesCaracteres,
  tailleDuMot,
} from "./geometrie";

const EVENTAIL = { ecart: 190, angleMax: 18, creux: 30 };

describe("l'anneau", () => {
  it("répète la phrase pour faire le tour, séparée par un point médian", () => {
    const caracteres = caracteresDeLAnneau("Codée", 40);
    const motif = `Codée${SEPARATEUR_ANNEAU}`;
    expect(caracteres.join("")).toBe(motif.repeat(Math.round(40 / motif.length)));
  });

  it("garde au moins une fois la phrase, même trop longue pour le tour", () => {
    expect(caracteresDeLAnneau("Une phrase bien plus longue que le tour", 5).join("")).toBe(
      `Une phrase bien plus longue que le tour${SEPARATEUR_ANNEAU}`,
    );
  });

  it("compte les caractères d'un périmètre", () => {
    // 2π × 420 / (64 × 0,62) = 66,5
    expect(caracteresPourLePerimetre(420, 64)).toBe(67);
  });

  it("ajuste le rayon pour garder la même chasse, quelle que soit la phrase", () => {
    const visee = 420;
    for (const phrase of ["Conçue · Codée · Livrée", "Designed · Built · Shipped", "Livrée"]) {
      const caracteres = caracteresDeLAnneau(phrase, caracteresPourLePerimetre(visee, 64));
      const rayon = rayonPourLesCaracteres(caracteres.length, 64);
      // Chasse réelle = périmètre / caractères : 0,62 × 64 = 39,7 px, à l'arrondi près.
      expect((2 * Math.PI * rayon) / caracteres.length).toBeCloseTo(0.62 * 64, 0);
      // Et le rayon reste proche du rayon visé (pas plus d'un motif d'écart).
      expect(Math.abs(rayon - visee) / visee).toBeLessThan(0.3);
    }
  });

  it("met de face la lettre devant, de dos celle derrière", () => {
    expect(lettreDeFace(0, 0)).toBe(true);
    expect(lettreDeFace(Math.PI, 0)).toBe(false);
    // Un demi-tour plus loin, elles ont échangé.
    expect(lettreDeFace(0, Math.PI)).toBe(false);
  });
});

describe("l'éventail", () => {
  it("empile tout au centre tant qu'il est fermé", () => {
    for (const place of placesDansLEventail(5, 0, EVENTAIL)) {
      expect(place.x === 0 && place.y === 0 && place.angle === 0).toBe(true);
    }
  });

  it("s'ouvre symétriquement, le milieu droit et devant", () => {
    const places = placesDansLEventail(5, 1, EVENTAIL);
    expect(places.map((p) => p.x)).toEqual([-380, -190, 0, 190, 380]);
    expect(places.map((p) => p.angle)).toEqual([-18, -9, 0, 9, 18]);
    expect(places[0]!.y).toBe(places[4]!.y);
    expect(places[2]!.y).toBe(0);
    const devant = Math.max(...places.map((p) => p.plan));
    expect(places[2]!.plan).toBe(devant);
    expect(places[1]!.plan).toBeGreaterThan(places[0]!.plan);
  });

  it("garde un écran seul droit, au centre", () => {
    expect(placesDansLEventail(1, 1, EVENTAIL)).toEqual([{ x: 0, y: 0, angle: 0, plan: 1 }]);
  });

  it("incline les bords au maximum, quel que soit le nombre d'écrans", () => {
    const places = placesDansLEventail(4, 1, EVENTAIL);
    expect(places[0]!.angle).toBe(-18);
    expect(places[3]!.angle).toBe(18);
  });
});

describe("la frappe de l'adresse", () => {
  it("ne tape rien avant le début, tout après la fin", () => {
    expect(caracteresTapes(9, 10, 50, 17)).toBe(0);
    expect(caracteresTapes(50, 10, 50, 17)).toBe(17);
    expect(caracteresTapes(80, 10, 50, 17)).toBe(17);
  });

  it("tape le premier caractère dès le début, puis régulièrement", () => {
    expect(caracteresTapes(10, 10, 50, 17)).toBe(1);
    const suite = Array.from({ length: 40 }, (_, i) => caracteresTapes(10 + i, 10, 50, 17));
    suite.slice(1).forEach((n, i) => expect(n).toBeGreaterThanOrEqual(suite[i]!));
    expect(Math.max(...suite)).toBeLessThanOrEqual(17);
  });

  it("ne tape rien pour une adresse vide", () => {
    expect(caracteresTapes(30, 10, 50, 0)).toBe(0);
  });
});

describe("le mot de la typo cinétique", () => {
  it("prend le plus grand corps qui tient, jamais au-delà du maximum", () => {
    expect(tailleDuMot(7, 1600, 260)).toBe(260);
    // 900 / (14 × 0,62) = 103,6
    expect(tailleDuMot(14, 900, 260)).toBe(103);
  });

  it("fait du point final la pastille d'accent", () => {
    expect(decouperLeMot("Livrée.")).toEqual({ lettres: [..."Livrée"], pastilleAuPoint: true });
    expect(decouperLeMot(" Shipped ")).toEqual({ lettres: [..."Shipped"], pastilleAuPoint: false });
  });
});

describe("l'éventail tient dans le cadre", () => {
  // Cadres réels, et bord droit de la colonne des légendes en 16:9 (« 05
  // Handicape Vaillant » en 46 px, mesuré sur planche à environ 620 px).
  const CADRES = { paysage: { largeur: 1920, limiteGauche: 700 }, portrait: { largeur: 1080, limiteGauche: 0 } };

  for (const format of ["paysage", "portrait"] as const) {
    it(`à cinq écrans, en ${format}`, () => {
      const mise = MISE_EN_PAGE_DE_L_EVENTAIL[format];
      const bords = bordsDeLEventail(
        5,
        { largeur: mise.largeur, hauteur: hauteurDuTelephone(mise.largeur), centreX: mise.centre.x },
        mise.eventail,
      );
      expect(bords.gauche).toBeGreaterThan(CADRES[format].limiteGauche);
      expect(bords.droite).toBeLessThan(CADRES[format].largeur);
    });
  }
});
