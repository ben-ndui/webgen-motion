import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { enregistrerFilm } from "../film-ecriture";
import { type FilmDeTest, filmDeTest } from "./film-de-test.test-utils";
import { genererLePortrait } from "./generation-portrait";
import { type GoogleLocal, demarrerGoogleLocal, portraitJpeg, portraitRendu } from "./veo-local.test-utils";

let google: GoogleLocal;
let film: FilmDeTest;
beforeEach(async () => {
  google = await demarrerGoogleLocal();
  film = filmDeTest(google.base);
});
afterEach(() => google.fermer());

const cheminDuPortrait = () => join(film.lieux.public("saya"), "cinema", "personnages", "awa.jpg");

describe("genererLePortrait", () => {
  it("demande à Gemini image un portrait fidèle à la description, sur le fond de la marque, puis le cite", async () => {
    film.creer();
    google.repondre(portraitRendu());
    expect(await genererLePortrait("saya", "awa", film.lieux)).toEqual({ ok: true, portrait: "cinema/personnages/awa.jpg" });

    expect(google.appels[0].chemin).toBe("/v1beta/models/gemini-3.1-flash-image:generateContent");
    const corps = JSON.parse(google.appels[0].corps);
    expect(corps.generationConfig).toEqual({ responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "9:16" } });
    const prompt = corps.contents[0].parts[0].text as string;
    expect(prompt).toContain("plain midnight navy blue background");
    expect(prompt).toContain("elegant braided updo");
    expect(readFileSync(cheminDuPortrait()).equals(portraitJpeg())).toBe(true);
    expect(film.fiche().cinema?.personnages[0].portrait).toBe("cinema/personnages/awa.jpg");
  });

  it("Google ne rend aucune image : 502 avec une phrase, rien d'écrit, la fiche ne bouge pas", async () => {
    film.creer();
    google.repondre({ statut: 200, corps: { candidates: [{ content: { parts: [{ text: "I can't do that." }] } }] } });
    expect(await genererLePortrait("saya", "awa", film.lieux)).toEqual({ ok: false, statut: 502, raison: expect.stringContaining("aucune image") });
    expect(existsSync(cheminDuPortrait())).toBe(false);
    expect(film.fiche().cinema?.personnages[0].portrait).toBeUndefined();
  });

  it("refuse ce qui n'est pas une image, même annoncé comme JPEG", async () => {
    film.creer();
    google.repondre(portraitRendu(Buffer.from("<html>erreur</html>")));
    expect(await genererLePortrait("saya", "awa", film.lieux)).toMatchObject({ ok: false, statut: 502, raison: expect.stringContaining("pas une image") });
    expect(existsSync(cheminDuPortrait())).toBe(false);
  });

  it("clé refusée par Google : la phrase dit où la corriger", async () => {
    film.creer();
    google.repondre({ statut: 403, corps: {} });
    expect(await genererLePortrait("saya", "awa", film.lieux)).toMatchObject({ ok: false, statut: 502, raison: expect.stringContaining("clé Gemini") });
  });

  it("personnage inconnu : 404 ; pas de clé : 412 ; sans appel à Google", async () => {
    film.creer();
    expect(await genererLePortrait("saya", "kofi", film.lieux)).toMatchObject({ ok: false, statut: 404 });
    expect(await genererLePortrait("saya", "awa", { ...film.lieux, veo: () => null })).toMatchObject({ ok: false, statut: 412 });
    expect(google.appels).toHaveLength(0);
  });

  it("personnage retiré de la fiche PENDANT la génération : le portrait n'est cité nulle part, et on le dit", async () => {
    film.creer();
    google.repondre(portraitRendu());
    const enCours = genererLePortrait("saya", "awa", film.lieux);
    const fiche = film.fiche();
    fiche.cinema!.personnages = [];
    fiche.cinema!.episodes[0].scenes = [{ id: "mer", decor: "The sea.", plans: [{ id: "vagues", consigne: "Waves.", personnages: [], objet: false }] }];
    enregistrerFilm("saya", fiche, film.lieux.fiches);
    expect(await enCours).toMatchObject({ ok: false, statut: 409, raison: expect.stringContaining("la fiche a changé") });
  });
});
