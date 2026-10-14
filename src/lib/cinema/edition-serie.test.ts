import { describe, expect, it } from "vitest";

import { FILM } from "../../../remotion/film/film";
import { serieSaya } from "../../../remotion/film/cinema/serie-exemple.test-utils";
import type { CinemaDuFilm } from "../../../remotion/film/cinema/types";
import { erreursDuCinema } from "../../../remotion/film/cinema/validerCinema";
import {
  ajouterUnEpisode,
  ajouterUnPersonnage,
  ajouterUnPlan,
  ajouterUneScene,
  basculerUnPersonnage,
  retirerUnPersonnage,
  retirerUnPlan,
  serieDeDepart,
} from "./edition-serie";

// Chaque geste doit laisser une série VALIDE : la fiche s'enregistre et se
// relit sans erreur pendant qu'on la remplit.
function valide(cinema: CinemaDuFilm): string[] {
  return erreursDuCinema({ ...JSON.parse(JSON.stringify(FILM)), cinema });
}
const ids = (cinema: CinemaDuFilm) => cinema.episodes.flatMap((e) => e.scenes.flatMap((s) => s.plans.map((p) => p.id)));

describe("gestes d'édition de la série", () => {
  it("une série neuve : un épisode, une scène, un plan, valide", () => {
    const serie = serieDeDepart();
    expect(serie.episodes).toHaveLength(1);
    expect(ids(serie)).toEqual(["plan-1"]);
    expect(valide(serie)).toEqual([]);
  });

  it("ajouter scènes, plans et épisodes donne des ids libres dans TOUT le film", () => {
    const serie = serieDeDepart();
    ajouterUnPlan(serie, "scene-1");
    ajouterUneScene(serie, "ep1");
    const ep2 = ajouterUnEpisode(serie);
    expect(ep2).toBe("ep2");
    expect(ids(serie)).toEqual(["plan-1", "plan-2", "plan-3", "plan-4"]);
    expect(serie.episodes[1].scenes[0].id).toBe("scene-3");
    expect(valide(serie)).toEqual([]);
  });

  it("à côté de plans nommés à la main (« rangement »), la numérotation repart de 1 sans collision", () => {
    const serie = serieSaya();
    ajouterUnPlan(serie, "boutique");
    expect(ids(serie)).toContain("plan-1");
    expect(valide(serie)).toEqual([]);
  });

  it("retirer un personnage le retire de tous ses plans, réplique comprise", () => {
    const serie = serieSaya();
    retirerUnPersonnage(serie, "awa");
    const confidence = serie.episodes[0].scenes[1].plans[0];
    expect(confidence.personnages).toEqual([]);
    expect(confidence.replique).toBeUndefined();
    expect(valide(serie)).toEqual([]);
  });

  it("basculer : un personnage entre, puis sort en perdant sa réplique", () => {
    const serie = serieSaya();
    ajouterUnPersonnage(serie);
    const confidence = serie.episodes[0].scenes[1].plans[0];
    basculerUnPersonnage(confidence, "personnage-1");
    expect(confidence.personnages).toEqual(["awa", "personnage-1"]);
    basculerUnPersonnage(confidence, "awa");
    expect(confidence.personnages).toEqual(["personnage-1"]);
    expect(confidence.replique).toBeUndefined();
    expect(valide(serie)).toEqual([]);
  });

  it("retirer le dernier plan d'une scène la retire ; retirer le tout dernier laisse une série de départ", () => {
    const serie = serieSaya();
    retirerUnPlan(serie, "confidence");
    expect(serie.episodes[0].scenes.map((s) => s.id)).toEqual(["boutique"]);
    retirerUnPlan(serie, "rangement");
    retirerUnPlan(serie, "flacon");
    expect(ids(serie)).toEqual(["plan-1"]);
    expect(valide(serie)).toEqual([]);
  });
});
