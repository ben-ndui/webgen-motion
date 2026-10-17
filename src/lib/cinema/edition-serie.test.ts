import { describe, expect, it } from "vitest";

import { FILM } from "../../../remotion/film/film";
import { serieSaya } from "../../../remotion/film/cinema/serie-exemple.test-utils";
import type { CinemaDuFilm } from "../../../remotion/film/cinema/types";
import { erreursDuCinema } from "../../../remotion/film/cinema/validerCinema";
import {
  ajouterUnElement,
  ajouterUnEpisode,
  ajouterUnPersonnage,
  ajouterUnPlan,
  ajouterUneScene,
  basculerUneReference,
  poserLaDecoupe,
  retirerUnElement,
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
    basculerUneReference(serie, confidence, "personnage-1");
    expect(confidence.personnages).toEqual(["awa", "personnage-1"]);
    expect(confidence.references).toEqual(["awa", "personnage-1"]);
    basculerUneReference(serie, confidence, "awa");
    expect(confidence.personnages).toEqual(["personnage-1"]);
    expect(confidence.references).toEqual(["personnage-1"]);
    expect(confidence.replique).toBeUndefined();
    expect(valide(serie)).toEqual([]);
  });

  it("basculer une créature l'ajoute aux références SANS la mettre dans .personnages (elle ne parle pas)", () => {
    const serie = serieSaya();
    ajouterUnElement(serie, "creature");
    const confidence = serie.episodes[0].scenes[1].plans[0];
    basculerUneReference(serie, confidence, "creature-1");
    expect(confidence.references).toEqual(["awa", "creature-1"]);
    expect(confidence.personnages).toEqual(["awa"]);
    basculerUneReference(serie, confidence, "creature-1");
    expect(confidence.references).toEqual(["awa"]);
    expect(valide(serie)).toEqual([]);
  });

  it("ajouter une créature, un objet puis un décor donne un id et un nom par type, sans collision entre types", () => {
    const serie = serieSaya();
    ajouterUnElement(serie, "creature");
    ajouterUnElement(serie, "objet");
    ajouterUnElement(serie, "decor");
    expect(serie.elements?.map((e) => [e.id, e.type, e.nom])).toEqual([
      ["creature-1", "creature", "Créature 1"],
      ["objet-1", "objet", "Objet 1"],
      ["decor-1", "decor", "Décor 1"],
    ]);
    expect(valide(serie)).toEqual([]);
  });

  it("retirer un élément le retire aussi des références des plans qui le citaient", () => {
    const serie = serieSaya();
    ajouterUnElement(serie, "creature");
    const confidence = serie.episodes[0].scenes[1].plans[0];
    confidence.references = ["awa", "creature-1"];
    retirerUnElement(serie, "creature-1");
    expect(serie.elements).toEqual([]);
    expect(confidence.references).toEqual(["awa"]);
    expect(valide(serie)).toEqual([]);
  });

  it("retirer un personnage le retire aussi des références des plans qui le citaient (pas seulement de .personnages)", () => {
    const serie = serieSaya();
    const confidence = serie.episodes[0].scenes[1].plans[0];
    confidence.references = ["awa"];
    retirerUnPersonnage(serie, "awa");
    expect(confidence.references).toEqual([]);
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

describe("poserLaDecoupe", () => {
  const plan = () => serieSaya().episodes[0].scenes[0].plans[0];

  it("pose début, fin et coupe au dixième", () => {
    const p = plan();
    poserLaDecoupe(p, { debut: 0.04, fin: 7.83, coupe: [4.01, 5.04] });
    expect(p.decoupe).toEqual({ debut: 0, fin: 7.8, coupe: [4, 5] });
  });

  it("ramène les bornes dans les 8 s et garde au moins une demi-seconde", () => {
    const p = plan();
    poserLaDecoupe(p, { debut: -2, fin: 12 });
    expect(p.decoupe).toBeUndefined();
    poserLaDecoupe(p, { debut: 6, fin: 6.1 });
    expect(p.decoupe).toEqual({ debut: 6, fin: 6.5 });
  });

  it("une coupe qui ne tient plus dans le morceau gardé tombe ; une coupe à l'envers est remise dans l'ordre", () => {
    const p = plan();
    poserLaDecoupe(p, { debut: 2, fin: 6, coupe: [1, 3] });
    expect(p.decoupe).toEqual({ debut: 2, fin: 6 });
    poserLaDecoupe(p, { debut: 0, fin: 8, coupe: [5, 4] });
    expect(p.decoupe).toEqual({ debut: 0, fin: 8, coupe: [4, 5] });
  });

  it("tout garder retire la découpe, et chaque résultat garde la série valide", () => {
    const serie = serieSaya();
    const p = serie.episodes[0].scenes[0].plans[0];
    poserLaDecoupe(p, { debut: 1, fin: 7, coupe: [3, 4] });
    expect(valide(serie)).toEqual([]);
    poserLaDecoupe(p, { debut: 0, fin: 8 });
    expect(p.decoupe).toBeUndefined();
  });
});
