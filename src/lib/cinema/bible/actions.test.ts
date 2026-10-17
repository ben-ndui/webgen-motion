import { beforeEach, describe, expect, it } from "vitest";

import { serieSaya } from "../../../../remotion/film/cinema/serie-exemple.test-utils";
import { type FilmDeTest, filmDeTest } from "../film-de-test.test-utils";
import { portraitJpeg } from "../veo-local.test-utils";
import { choisirLaVuePrincipaleDeLaBible, deverrouillerUneReferenceDeLaBible, retenirUneVersionDeLaBible, validerUneReferenceDeLaBible } from "./actions";
import { importerUneImageDeLaBible } from "./generation";

let film: FilmDeTest;
beforeEach(() => {
  film = filmDeTest("http://inutilise.test");
});

describe("retenirUneVersionDeLaBible", () => {
  it("fait revenir la vue sur une ancienne version", () => {
    film.creer();
    importerUneImageDeLaBible("saya", "awa", "face", portraitJpeg(), false, film.lieux);
    importerUneImageDeLaBible("saya", "awa", "face", portraitJpeg(), false, film.lieux);
    expect(retenirUneVersionDeLaBible("saya", "awa", "face", 1, film.lieux)).toEqual({ ok: true });
    expect(film.bible().references.awa.vues.face?.retenue).toBe(1);
  });

  it("référence inconnue : 404", () => {
    film.creer();
    expect(retenirUneVersionDeLaBible("saya", "inconnue", "face", 1, film.lieux)).toMatchObject({ ok: false, statut: 404 });
  });

  it("version inexistante : 409 avec la raison", () => {
    film.creer();
    expect(retenirUneVersionDeLaBible("saya", "awa", "face", 9, film.lieux)).toMatchObject({ ok: false, statut: 409, raison: expect.stringContaining("n'existe pas") });
  });
});

describe("choisirLaVuePrincipaleDeLaBible", () => {
  it("choisit la vue principale quand elle a une image", () => {
    film.creer();
    importerUneImageDeLaBible("saya", "awa", "en-pied", portraitJpeg(), false, film.lieux);
    expect(choisirLaVuePrincipaleDeLaBible("saya", "awa", "en-pied", film.lieux)).toEqual({ ok: true });
    expect(film.bible().references.awa.principale).toBe("en-pied");
  });

  it("refuse une vue qui n'existe pas pour ce type", () => {
    const serie = serieSaya();
    serie.elements = [{ id: "couronne", type: "objet", nom: "Couronne", description: "x" }];
    film.creer(serie);
    importerUneImageDeLaBible("saya", "couronne", "image", portraitJpeg(), false, film.lieux);
    expect(choisirLaVuePrincipaleDeLaBible("saya", "couronne", "face", film.lieux)).toMatchObject({ ok: false, statut: 409 });
  });
});

describe("validerUneReferenceDeLaBible / deverrouillerUneReferenceDeLaBible", () => {
  it("valide verrouille, et une nouvelle version est refusée tant que ce n'est pas déverrouillé", () => {
    film.creer();
    importerUneImageDeLaBible("saya", "awa", "face", portraitJpeg(), false, film.lieux);
    expect(validerUneReferenceDeLaBible("saya", "awa", film.lieux)).toEqual({ ok: true });
    expect(film.bible().references.awa.statut).toBe("valide");
    expect(importerUneImageDeLaBible("saya", "awa", "face", portraitJpeg(), false, film.lieux)).toMatchObject({ ok: false, statut: 409 });
  });

  it("refuse de valider une référence sans aucune image", () => {
    film.creer();
    expect(validerUneReferenceDeLaBible("saya", "awa", film.lieux)).toMatchObject({ ok: false, statut: 409, raison: expect.stringContaining("Rien à valider") });
  });

  it("déverrouiller exige un motif, et rend la référence modifiable de nouveau", () => {
    film.creer();
    importerUneImageDeLaBible("saya", "awa", "face", portraitJpeg(), false, film.lieux);
    validerUneReferenceDeLaBible("saya", "awa", film.lieux);
    expect(deverrouillerUneReferenceDeLaBible("saya", "awa", "", film.lieux)).toMatchObject({ ok: false, statut: 409 });
    expect(deverrouillerUneReferenceDeLaBible("saya", "awa", "le visage a changé", film.lieux)).toEqual({ ok: true });
    expect(film.bible().references.awa.statut).toBe("propose");
    expect(importerUneImageDeLaBible("saya", "awa", "face", portraitJpeg(), false, film.lieux)).toMatchObject({ ok: true });
  });
});
