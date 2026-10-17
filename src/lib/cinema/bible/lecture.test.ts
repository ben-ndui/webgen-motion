import { beforeEach, describe, expect, it } from "vitest";

import { serieSaya } from "../../../../remotion/film/cinema/serie-exemple.test-utils";
import { creerFilm } from "../../film-ecriture";
import { ficheValide } from "../../film-fixtures.test-utils";
import { type FilmDeTest, filmDeTest } from "../film-de-test.test-utils";
import { portraitJpeg } from "../veo-local.test-utils";
import { importerUneImageDeLaBible } from "./generation";
import { lireLaBibleDeLaSerie } from "./lecture";

let film: FilmDeTest;
beforeEach(() => {
  film = filmDeTest("http://inutilise.test");
});

describe("lireLaBibleDeLaSerie", () => {
  it("liste les personnages puis les éléments, chacun avec sa fiche visuelle", () => {
    const serie = serieSaya();
    serie.elements = [{ id: "sahor", type: "creature", nom: "Sahor", description: "x" }];
    film.creer(serie);
    const reponse = lireLaBibleDeLaSerie("saya", film.lieux);
    expect(reponse).toMatchObject({
      ok: true,
      references: [
        { id: "awa", type: "personnage", fiche: { statut: "propose", vues: {} } },
        { id: "sahor", type: "creature", fiche: { statut: "propose", vues: {} } },
      ],
    });
  });

  it("une référence avec une image en montre la fiche à jour", () => {
    film.creer();
    importerUneImageDeLaBible("saya", "awa", "face", portraitJpeg(), false, film.lieux);
    const reponse = lireLaBibleDeLaSerie("saya", film.lieux);
    expect(reponse.ok && reponse.references[0].fiche.vues.face?.versions).toHaveLength(1);
  });

  it("film sans série : 400", () => {
    creerFilm("sans-serie", ficheValide(), film.lieux.fiches);
    expect(lireLaBibleDeLaSerie("sans-serie", film.lieux)).toMatchObject({ ok: false, statut: 400 });
  });
});
