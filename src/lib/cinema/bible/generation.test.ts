import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { serieSaya } from "../../../../remotion/film/cinema/serie-exemple.test-utils";
import { type FilmDeTest, filmDeTest } from "../film-de-test.test-utils";
import { type GoogleLocal, demarrerGoogleLocal, portraitJpeg, portraitRendu } from "../veo-local.test-utils";
import { genererUneImageDeLaBible, importerUneImageDeLaBible } from "./generation";

let google: GoogleLocal;
let film: FilmDeTest;
beforeEach(async () => {
  google = await demarrerGoogleLocal();
  film = filmDeTest(google.base);
});
afterEach(() => google.fermer());

function avecUneCreature() {
  const serie = serieSaya();
  serie.elements = [{ id: "sahor", type: "creature", nom: "Sahor", description: "A black and silver supernatural wolf, violet eyes." }];
  return serie;
}

describe("genererUneImageDeLaBible", () => {
  it("génère une vue, l'écrit sur le disque et la cite comme version 1, retenue, non validée", async () => {
    film.creer();
    google.repondre(portraitRendu());
    expect(await genererUneImageDeLaBible("saya", "awa", "face", film.lieux)).toEqual({ ok: true, fichier: "cinema/bible/awa/face-v1.jpg" });

    const prompt = JSON.parse(google.appels[0].corps).contents[0].parts[0].text as string;
    expect(prompt).toContain("facing directly towards the camera");
    expect(readFileSync(join(film.lieux.public("saya"), "cinema", "bible", "awa", "face-v1.jpg")).equals(portraitJpeg())).toBe(true);

    const fiche = film.bible().references.awa;
    expect(fiche.statut).toBe("propose");
    expect(fiche.vues.face).toEqual({ versions: [{ n: 1, fichier: "cinema/bible/awa/face-v1.jpg", origine: "generee", creeeLe: expect.any(String) }], retenue: 1 });
    expect(film.bible().imagesGenerees).toBe(1);
  });

  it("une deuxième génération de la même vue devient la version 2", async () => {
    film.creer();
    google.repondre(portraitRendu(), portraitRendu());
    await genererUneImageDeLaBible("saya", "awa", "face", film.lieux);
    expect(await genererUneImageDeLaBible("saya", "awa", "face", film.lieux)).toEqual({ ok: true, fichier: "cinema/bible/awa/face-v2.jpg" });
    expect(film.bible().references.awa.vues.face?.versions).toHaveLength(2);
    expect(film.bible().imagesGenerees).toBe(2);
  });

  it("une créature se génère pareil, avec ses propres vues", async () => {
    film.creer(avecUneCreature());
    google.repondre(portraitRendu());
    expect(await genererUneImageDeLaBible("saya", "sahor", "profil", film.lieux)).toEqual({ ok: true, fichier: "cinema/bible/sahor/profil-v1.jpg" });
    const prompt = JSON.parse(google.appels[0].corps).contents[0].parts[0].text as string;
    expect(prompt).toContain("exact side profile view");
    expect(prompt).toContain("supernatural wolf");
  });

  it("refuse une vue qui n'existe pas pour ce type (un objet n'a qu'une « image »)", async () => {
    const serie = serieSaya();
    serie.elements = [{ id: "couronne", type: "objet", nom: "Couronne", description: "A golden crown with emerald leaves." }];
    film.creer(serie);
    expect(await genererUneImageDeLaBible("saya", "couronne", "face", film.lieux)).toMatchObject({ ok: false, statut: 400 });
    expect(google.appels).toHaveLength(0);
  });

  it("référence inconnue : 404 ; sans clé : 412 ; sans appel à Google", async () => {
    film.creer();
    expect(await genererUneImageDeLaBible("saya", "inconnue", "face", film.lieux)).toMatchObject({ ok: false, statut: 404 });
    expect(await genererUneImageDeLaBible("saya", "awa", "face", { ...film.lieux, veo: () => null })).toMatchObject({ ok: false, statut: 412 });
    expect(google.appels).toHaveLength(0);
  });

  it("une description encore à l'exemple : 400, sans appel à Google", async () => {
    const { EXEMPLES_DE_SERIE } = await import("../../../../remotion/film/cinema/exemples");
    const serie = serieSaya();
    serie.personnages[0].description = EXEMPLES_DE_SERIE.description;
    film.creer(serie);
    expect(await genererUneImageDeLaBible("saya", "awa", "face", film.lieux)).toMatchObject({ ok: false, statut: 400, raison: expect.stringContaining("Décris d'abord Awa") });
    expect(google.appels).toHaveLength(0);
  });

  it("référence déjà validée : refusé AVANT d'appeler Google (pas payé pour rien)", async () => {
    film.creer();
    film.validerLaBiblePour("awa");
    expect(await genererUneImageDeLaBible("saya", "awa", "trois-quarts", film.lieux)).toMatchObject({ ok: false, statut: 409, raison: expect.stringContaining("verrouillée") });
    expect(google.appels).toHaveLength(0);
  });

  it("budget d'images atteint : refusé avant d'appeler Google", async () => {
    film.creer({ ...serieSaya(), budgetImages: 1 });
    google.repondre(portraitRendu());
    await genererUneImageDeLaBible("saya", "awa", "face", film.lieux);
    expect(await genererUneImageDeLaBible("saya", "awa", "profil", film.lieux)).toMatchObject({ ok: false, statut: 409, raison: expect.stringContaining("1 sur 1") });
    expect(google.appels).toHaveLength(1);
  });

  it("le double clic sur la même vue ne lance (et ne paie) qu'une génération", async () => {
    film.creer();
    google.repondre(portraitRendu());
    const [premiere, seconde] = [genererUneImageDeLaBible("saya", "awa", "face", film.lieux), genererUneImageDeLaBible("saya", "awa", "face", film.lieux)];
    expect(await seconde).toMatchObject({ ok: false, statut: 409, raison: expect.stringContaining("déjà en cours") });
    expect(await premiere).toMatchObject({ ok: true });
    expect(google.appels).toHaveLength(1);
  });

  it("Google ne rend aucune image : rien n'est cité, le budget n'est pas consommé", async () => {
    film.creer();
    google.repondre({ statut: 200, corps: { candidates: [{ content: { parts: [{ text: "I can't do that." }] } }] } });
    expect(await genererUneImageDeLaBible("saya", "awa", "face", film.lieux)).toMatchObject({ ok: false, statut: 502 });
    expect(film.bible().references.awa).toBeUndefined();
    expect(film.bible().imagesGenerees).toBe(0);
    expect(film.bible().enCours["awa/face"]).toBeUndefined();
  });
});

describe("importerUneImageDeLaBible", () => {
  it("importe un fichier comme nouvelle version, sans toucher le budget d'images", async () => {
    film.creer();
    const reponse = importerUneImageDeLaBible("saya", "awa", "en-pied", portraitJpeg(), true, film.lieux);
    expect(reponse).toEqual({ ok: true, fichier: "cinema/bible/awa/en-pied-v1.jpg" });
    const version = film.bible().references.awa.vues["en-pied"]?.versions[0];
    expect(version).toMatchObject({ origine: "importee", droitsDeclares: true });
    expect(film.bible().imagesGenerees).toBe(0);
  });

  it("refuse un fichier qui n'est pas une image", () => {
    film.creer();
    expect(importerUneImageDeLaBible("saya", "awa", "face", Buffer.from("pas une image"), false, film.lieux)).toMatchObject({ ok: false, statut: 400 });
  });

  it("refuse d'importer sur une référence déjà validée", () => {
    film.creer();
    film.validerLaBiblePour("awa");
    expect(importerUneImageDeLaBible("saya", "awa", "profil", portraitJpeg(), false, film.lieux)).toMatchObject({ ok: false, statut: 409, raison: expect.stringContaining("verrouillée") });
    expect(existsSync(join(film.lieux.public("saya"), "cinema", "bible", "awa", "profil-v1.jpg"))).toBe(false);
  });

  it("référence inconnue : 404", () => {
    film.creer();
    expect(importerUneImageDeLaBible("saya", "inconnue", "face", portraitJpeg(), false, film.lieux)).toMatchObject({ ok: false, statut: 404 });
  });

  it("vue qui n'existe pas pour ce type : 400", () => {
    const serie = serieSaya();
    serie.elements = [{ id: "palais", type: "decor", nom: "Palais d'Amanléa", description: "x" }];
    film.creer(serie);
    expect(importerUneImageDeLaBible("saya", "palais", "face", portraitJpeg(), false, film.lieux)).toMatchObject({ ok: false, statut: 400 });
  });
});
