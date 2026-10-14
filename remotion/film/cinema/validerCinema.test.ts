import { describe, expect, it } from "vitest";

import { FILM } from "../film";
import type { CinemaDuFilm } from "./types";
import { erreursDuCinema } from "./validerCinema";

// Le Reel promo SAYA du 14/10, tel qu'il a été tourné à la main.
function cinemaSaya(): CinemaDuFilm {
  return {
    personnage: "A Black woman with an elegant braided updo, in a midnight navy silk gown embroidered with gold.",
    objet: "An amber faceted glass perfume bottle with a gold hibiscus-shaped stopper.",
    plans: [
      { id: "jardin", role: "scene", consigne: "She picks a red hibiscus and breathes in its scent." },
      { id: "geste", role: "geste", consigne: "She sprays the bottle on her neck, golden mist." },
      { id: "flacon", role: "objet", consigne: "The bottle on navy velvet, petals falling." },
    ],
  };
}

// La fiche d'exemple avec un cinéma quelconque, même faux : c'est le validateur qu'on éprouve.
function ficheAvec(cinema: unknown): unknown {
  const spec = JSON.parse(JSON.stringify(FILM)) as Record<string, unknown>;
  spec.cinema = cinema;
  return spec;
}

describe("erreursDuCinema", () => {
  it("n'exige rien d'une fiche sans cinéma", () => {
    expect(erreursDuCinema(ficheAvec(undefined))).toEqual([]);
  });

  it("accepte le Reel promo SAYA, découpe comprise", () => {
    const cinema = cinemaSaya();
    cinema.plans[0].decoupe = { debut: 0, fin: 7.8, coupe: [4, 5] };
    cinema.plans[0].fichier = "cinema/jardin.mp4";
    expect(erreursDuCinema(ficheAvec(cinema))).toEqual([]);
  });

  it("refuse un geste sans objet décrit : Veo inventerait un objet différent à chaque plan", () => {
    const cinema = cinemaSaya();
    delete cinema.objet;
    expect(erreursDuCinema(ficheAvec(cinema))).toEqual([
      "cinema.plans[1].role : « geste » demande que cinema.objet soit décrit",
      "cinema.plans[2].role : « objet » demande que cinema.objet soit décrit",
    ]);
  });

  it("accepte une scène seule, sans personnage ni objet", () => {
    expect(erreursDuCinema(ficheAvec({ plans: [{ id: "mer", role: "scene", consigne: "Waves at dawn." }] }))).toEqual([]);
  });

  it("borne le nombre de plans : zéro et cinq sont refusés", () => {
    expect(erreursDuCinema(ficheAvec({ plans: [] }))).toEqual(["cinema.plans : 1 à 4 plans, 0 reçus"]);
    const cinq = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, role: "scene", consigne: "x" }));
    expect(erreursDuCinema(ficheAvec({ plans: cinq }))).toEqual(["cinema.plans : 1 à 4 plans, 5 reçus"]);
  });

  it("refuse un id qui sortirait du dossier, et un id en double", () => {
    const cinema = cinemaSaya();
    cinema.plans[0].id = "../jardin";
    cinema.plans[2].id = "geste";
    expect(erreursDuCinema(ficheAvec(cinema))).toEqual([
      "cinema.plans[0].id : lettres, chiffres, _ et - seulement",
      "cinema.plans[2].id : « geste » est déjà pris",
    ]);
  });

  it("refuse un fichier hors de cinema/ (la fiche ne pointe pas ailleurs dans public/)", () => {
    const cinema = cinemaSaya();
    for (const fichier of ["../../secret.mp4", "cinema/../../secret.mp4", "cinema/sous/plan.mp4", "cinema/plan.mov"]) {
      cinema.plans[0].fichier = fichier;
      expect(erreursDuCinema(ficheAvec(cinema))).toEqual(["cinema.plans[0].fichier : cinema/<plan>.mp4 (posé par GEN MOTION)"]);
    }
  });

  it("refuse une découpe hors des 8 s, ou une coupe qui touche les bords", () => {
    const cinema = cinemaSaya();
    cinema.plans[0].decoupe = { debut: 2, fin: 9 };
    cinema.plans[1].decoupe = { debut: 1, fin: 6, coupe: [1, 3] };
    cinema.plans[2].decoupe = { debut: 3, fin: 3 };
    expect(erreursDuCinema(ficheAvec(cinema))).toEqual([
      "cinema.plans[0].decoupe : début et fin entre 0 et 8 s, fin après début",
      "cinema.plans[1].decoupe.coupe : [début, fin] strictement à l'intérieur du morceau gardé",
      "cinema.plans[2].decoupe : début et fin entre 0 et 8 s, fin après début",
    ]);
  });

  it("borne le budget : 0, 60 et 2,5 sont refusés, absent vaut 6", () => {
    for (const budget of [0, 60, 2.5]) {
      expect(erreursDuCinema(ficheAvec({ ...cinemaSaya(), budget }))).toEqual(["cinema.budget : nombre entier de plans, de 1 à 24"]);
    }
    expect(erreursDuCinema(ficheAvec({ ...cinemaSaya(), budget: 6 }))).toEqual([]);
  });

  it("refuse une qualité inconnue et une consigne vide", () => {
    const cinema = { ...cinemaSaya(), qualite: "ultra" };
    cinema.plans[0].consigne = "  ";
    expect(erreursDuCinema(ficheAvec(cinema))).toEqual([
      "cinema.qualite : l'une de fast, lite",
      "cinema.plans[0].consigne : texte non vide attendu",
    ]);
  });
});
