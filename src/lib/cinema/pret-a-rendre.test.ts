import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { serieSaya } from "../../../remotion/film/cinema/serie-exemple.test-utils";
import { ecrireAtomiquement } from "../film-fichiers-deposes";
import { dossierJetable, ficheValide } from "../film-fixtures.test-utils";
import { MESSAGE_SANS_SERIE, problemesDeLEpisode } from "./pret-a-rendre";
import { videoMp4 } from "./veo-local.test-utils";

function ficheAvecVideos(sur: string[]) {
  const dossier = dossierJetable("pret");
  const spec = ficheValide();
  spec.cinema = serieSaya();
  spec.cinema.episodes[0].scenes.flatMap((s) => s.plans).forEach((plan) => (plan.fichier = `cinema/${plan.id}.mp4`));
  for (const id of sur) ecrireAtomiquement(join(dossier, "cinema", `${id}.mp4`), videoMp4());
  return { spec, dossier };
}

describe("problemesDeLEpisode", () => {
  it("rendable quand chaque plan a sa vidéo SUR LE DISQUE", () => {
    const { spec, dossier } = ficheAvecVideos(["rangement", "flacon", "confidence"]);
    expect(problemesDeLEpisode(spec, "ep1", dossier)).toEqual([]);
  });

  it("nomme chaque plan manquant : pas généré, ou cité mais absent du disque", () => {
    const { spec, dossier } = ficheAvecVideos(["rangement"]);
    delete spec.cinema!.episodes[0].scenes[0].plans[1].fichier;
    expect(problemesDeLEpisode(spec, "ep1", dossier)).toEqual([
      "scène 1, plan 2 : pas encore généré",
      "scène 2, plan 1 : vidéo absente du disque (cinema/confidence.mp4)",
    ]);
  });

  it("sans série ou épisode inconnu : une phrase, pas un plantage", () => {
    const { spec, dossier } = ficheAvecVideos([]);
    expect(problemesDeLEpisode(spec, "ep9", dossier)).toEqual(["épisode « ep9 » introuvable dans la série"]);
    delete spec.cinema;
    expect(problemesDeLEpisode(spec, "ep1", dossier)).toEqual([MESSAGE_SANS_SERIE]);
  });
});
