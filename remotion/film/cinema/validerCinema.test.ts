import { describe, expect, it } from "vitest";

import { FILM } from "../film";
import { serieSaya } from "./serie-exemple.test-utils";
import { erreursDuCinema } from "./validerCinema";

// La fiche d'exemple avec un cinéma quelconque, même faux : c'est le validateur qu'on éprouve.
function ficheAvec(cinema: unknown): unknown {
  const spec = JSON.parse(JSON.stringify(FILM)) as Record<string, unknown>;
  spec.cinema = cinema;
  return spec;
}
const erreurs = (cinema: unknown) => erreursDuCinema(ficheAvec(cinema));

describe("erreursDuCinema — format série", () => {
  it("n'exige rien d'une fiche sans cinéma", () => {
    expect(erreurs(undefined)).toEqual([]);
  });

  it("accepte l'épisode SAYA, portrait, fichier et découpe compris", () => {
    const serie = serieSaya();
    serie.personnages[0].portrait = "cinema/personnages/awa.jpg";
    const plan = serie.episodes[0].scenes[0].plans[0];
    plan.fichier = "cinema/rangement.mp4";
    plan.decoupe = { debut: 0, fin: 7.8, coupe: [4, 5] };
    expect(erreurs(serie)).toEqual([]);
  });

  it("accepte un Reel sans personnage : un épisode, une scène, un plan", () => {
    const reel = { personnages: [], episodes: [{ id: "reel", titre: "Reel", scenes: [{ id: "mer", decor: "The sea at dawn.", plans: [{ id: "vagues", consigne: "Waves.", personnages: [], objet: false }] }] }] };
    expect(erreurs(reel)).toEqual([]);
  });

  it("refuse un personnage inconnu, cité deux fois, ou plus de trois dans un plan", () => {
    const serie = serieSaya();
    serie.personnages.push(
      { id: "kofi", nom: "Kofi", description: "x" },
      { id: "lea", nom: "Léa", description: "x" },
      { id: "nina", nom: "Nina", description: "x" },
    );
    const plans = serie.episodes[0].scenes[0].plans;
    plans[0].personnages = ["awa", "awa"];
    plans[1].personnages = ["awa", "kofi", "lea", "nina"];
    serie.episodes[0].scenes[1].plans[0].personnages = ["awa", "inconnue"];
    expect(erreurs(serie)).toEqual([
      "cinema.episodes[0].scenes[0].plans[0].personnages : un personnage cité deux fois",
      "cinema.episodes[0].scenes[0].plans[1].personnages : 3 personnages au plus (limite de Veo), 4 reçus",
      "cinema.episodes[0].scenes[1].plans[0].personnages : personnage inconnu « inconnue »",
    ]);
  });

  it("refuse une réplique dite par quelqu'un qui n'est pas à l'image, ou trop longue pour 8 s", () => {
    const serie = serieSaya();
    const plan = serie.episodes[0].scenes[1].plans[0];
    plan.personnages = [];
    plan.replique = { personnage: "awa", texte: "x".repeat(121) };
    expect(erreurs(serie)).toEqual([
      "cinema.episodes[0].scenes[1].plans[0].replique.texte : 120 caractères au plus (8 s), 121 reçus",
      "cinema.episodes[0].scenes[1].plans[0].replique.personnage : « awa » doit être à l'image dans ce plan",
    ]);
  });

  it("refuse un objet à l'image quand l'objet du film n'est pas décrit", () => {
    const serie = serieSaya();
    delete serie.objet;
    expect(erreurs(serie)).toEqual([
      "cinema.episodes[0].scenes[0].plans[0].objet : décris d'abord l'objet du film (cinema.objet)",
      "cinema.episodes[0].scenes[0].plans[1].objet : décris d'abord l'objet du film (cinema.objet)",
    ]);
  });

  it("un id de plan est unique dans TOUT le film (il nomme le fichier), même d'une scène à l'autre", () => {
    const serie = serieSaya();
    serie.episodes[0].scenes[1].plans[0].id = "flacon";
    expect(erreurs(serie)).toEqual(["cinema.episodes[0].scenes[1].plans[0].id : « flacon » est déjà pris dans ce film"]);
  });

  it("refuse les ids et les fichiers qui sortiraient de leur dossier", () => {
    const serie = serieSaya();
    serie.personnages[0].id = "../awa";
    serie.personnages[0].portrait = "cinema/personnages/../../x.jpg";
    serie.episodes[0].scenes[0].plans[0].fichier = "cinema/../../secret.mp4";
    const liste = erreurs(serie);
    expect(liste).toContain("cinema.personnages[0].id : lettres, chiffres, _ et - seulement");
    expect(liste).toContain("cinema.personnages[0].portrait : cinema/personnages/<id>.jpg ou .png (posé par GEN MOTION)");
    expect(liste).toContain("cinema.episodes[0].scenes[0].plans[0].fichier : cinema/<plan>.mp4 (posé par GEN MOTION)");
  });

  it("borne les épisodes, les scènes et les plans ; vide est refusé à chaque niveau", () => {
    expect(erreurs({ personnages: [], episodes: [] })).toEqual(["cinema.episodes : 1 à 12 épisodes, 0 reçus"]);
    const serie = serieSaya();
    serie.episodes[0].scenes[1].plans = [];
    serie.episodes.push({ id: "ep2", titre: "Suite", scenes: [] });
    expect(erreurs(serie)).toEqual([
      "cinema.episodes[0].scenes[1].plans : 1 à 6 plans, 0 reçus",
      "cinema.episodes[1].scenes : 1 à 4 scènes, 0 reçus",
    ]);
  });

  it("borne le budget : 0, 600 et 2,5 sont refusés", () => {
    for (const budget of [0, 600, 2.5]) {
      expect(erreurs({ ...serieSaya(), budget })).toEqual(["cinema.budget : nombre entier de plans, de 1 à 60"]);
    }
  });

  it("refuse le format plat du lot 1 avec un message qui pointe le bon endroit", () => {
    expect(erreurs({ plans: [{ id: "jardin", role: "scene", consigne: "x" }] })).toEqual([
      "cinema.personnages : liste attendue (vide s'il n'y a personne)",
      "cinema.episodes : liste attendue",
    ]);
  });
});
