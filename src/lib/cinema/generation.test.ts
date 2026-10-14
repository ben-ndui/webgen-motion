import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { serieSaya } from "../../../remotion/film/cinema/serie-exemple.test-utils";
import { creerFilm, enregistrerFilm } from "../film-ecriture";
import { ficheValide } from "../film-fixtures.test-utils";
import { type FilmDeTest, filmDeTest } from "./film-de-test.test-utils";
import { VIDEO_GARDEE_PAR_GOOGLE_MS, genererUnPlan, suivreLePlan } from "./generation";
import { type GoogleLocal, demarrerGoogleLocal, enCours, lancementAccepte, portraitJpeg, termine, videoMp4 } from "./veo-local.test-utils";

let google: GoogleLocal;
let film: FilmDeTest;
beforeEach(async () => {
  google = await demarrerGoogleLocal();
  film = filmDeTest(google.base);
});
afterEach(() => google.fermer());

const lancements = () => google.appels.filter((appel) => appel.methode === "POST");
const corpsDuLancement = (index = 0) => JSON.parse(lancements()[index].corps);

describe("plans avec personnage", () => {
  it("le parcours complet : Fast, portrait d'Awa en référence, prêt, fichier cité, plan compté", async () => {
    film.creer(film.donnerUnPortraitAAwa());
    google.repondre(lancementAccepte(), enCours(), termine(google.base), { statut: 200, video: true });

    expect(await genererUnPlan("saya", "rangement", film.lieux)).toMatchObject({
      ok: true,
      plan: { etat: "en-cours" },
      budget: { utilises: 1, plafond: 20 },
      modele: { qualite: "fast", coutUsd: 0.96, pourquoi: "Awa est à l'image : Fast garde le même visage." },
    });
    expect(lancements()[0].chemin).toContain("veo-3.1-fast-generate-preview");
    const instance = corpsDuLancement().instances[0];
    expect(instance.referenceImages).toEqual([{ image: { bytesBase64Encoded: portraitJpeg().toString("base64"), mimeType: "image/jpeg" }, referenceType: "asset" }]);
    expect(instance.prompt).toContain("Awa (reference image 1)");
    expect(instance.prompt).toContain("Avoid: text, letters");
    expect(corpsDuLancement().parameters.negativePrompt).toBeUndefined();

    expect(await suivreLePlan("saya", "rangement", film.lieux)).toMatchObject({ plan: { etat: "en-cours" } });
    expect(await suivreLePlan("saya", "rangement", film.lieux)).toMatchObject({ plan: { etat: "pret", fichier: "cinema/rangement.mp4" } });
    expect(readFileSync(join(film.lieux.public("saya"), "cinema", "rangement.mp4")).equals(videoMp4())).toBe(true);
    expect(film.fiche().cinema?.episodes[0].scenes[0].plans[0].fichier).toBe("cinema/rangement.mp4");
    expect(film.registre()).toEqual({ utilises: 1, operations: {} });
  });

  it("sans portrait d'Awa : refusé AVANT de réserver et d'appeler Google (son visage changerait)", async () => {
    film.creer();
    expect(await genererUnPlan("saya", "rangement", film.lieux)).toEqual({ ok: false, statut: 409, raison: expect.stringContaining("Awa n'a pas encore de portrait") });
    expect(google.appels).toHaveLength(0);
    expect(film.registre().utilises).toBe(0);
  });

  it("un portrait cité par la fiche mais absent du disque est traité comme manquant", async () => {
    const serie = serieSaya();
    serie.personnages[0].portrait = "cinema/personnages/awa.jpg";
    film.creer(serie);
    expect(await genererUnPlan("saya", "confidence", film.lieux)).toMatchObject({ ok: false, statut: 409 });
    expect(google.appels).toHaveLength(0);
  });

  it("la réplique part dans le prompt du plan où Awa parle", async () => {
    film.creer(film.donnerUnPortraitAAwa());
    google.repondre(lancementAccepte());
    await genererUnPlan("saya", "confidence", film.lieux);
    expect(corpsDuLancement().instances[0].prompt).toContain("Awa says softly in French: « Ce parfum, c'est l'histoire de ma grand-mère. »");
  });
});

describe("plans sans personnage", () => {
  it("Lite, sans portrait ni negativePrompt (Lite les refuse), interdits dans le prompt", async () => {
    film.creer();
    google.repondre(lancementAccepte());
    expect(await genererUnPlan("saya", "flacon", film.lieux)).toMatchObject({ ok: true, modele: { qualite: "lite", coutUsd: 0.64 } });
    expect(lancements()[0].chemin).toContain("veo-3.1-lite-generate-preview");
    const corps = corpsDuLancement();
    expect(corps.instances[0].referenceImages).toBeUndefined();
    expect(corps.parameters.negativePrompt).toBeUndefined();
    expect(corps.instances[0].prompt).toContain("Avoid: text, letters");
  });
});

describe("argent et reprise", () => {
  it("le double clic ne lance (et ne paie) qu'une génération", async () => {
    film.creer();
    google.repondre(lancementAccepte());
    await genererUnPlan("saya", "flacon", film.lieux);
    expect(await genererUnPlan("saya", "flacon", film.lieux)).toMatchObject({ ok: true, plan: { etat: "en-cours" } });
    expect(lancements()).toHaveLength(1);
    expect(film.registre().utilises).toBe(1);
  });

  it("sans clé Gemini : 412, et rien n'est réservé", async () => {
    film.creer();
    expect(await genererUnPlan("saya", "flacon", { ...film.lieux, veo: () => null })).toMatchObject({ ok: false, statut: 412 });
    expect(film.registre().utilises).toBe(0);
  });

  it("lancement refusé par Google : rien n'est compté, et le message le dit", async () => {
    film.creer();
    google.repondre({ statut: 429, corps: { error: { message: "RESOURCE_EXHAUSTED" } } });
    expect(await genererUnPlan("saya", "flacon", film.lieux)).toMatchObject({ ok: false, statut: 502, raison: expect.stringContaining("Rien n'a été facturé.") });
    expect(film.registre()).toEqual({ utilises: 0, operations: {} });
  });

  it("plan refusé par le filtre de Google : rendu au budget, et on peut relancer", async () => {
    film.creer();
    google.repondre(lancementAccepte(), { statut: 200, corps: { done: true, response: { generateVideoResponse: { raiMediaFilteredReasons: ["Unsafe."] } } } }, lancementAccepte());
    await genererUnPlan("saya", "flacon", film.lieux);
    expect(await suivreLePlan("saya", "flacon", film.lieux)).toMatchObject({ plan: { etat: "refuse", raison: expect.stringContaining("Unsafe.") }, budget: { utilises: 0 } });
    expect(await genererUnPlan("saya", "flacon", film.lieux)).toMatchObject({ ok: true, plan: { etat: "en-cours" } });
  });

  it("budget atteint : le deuxième plan est refusé AVANT d'appeler Google", async () => {
    film.creer({ ...film.donnerUnPortraitAAwa(), budget: 1 });
    google.repondre(lancementAccepte());
    await genererUnPlan("saya", "flacon", film.lieux);
    expect(await genererUnPlan("saya", "rangement", film.lieux)).toEqual({ ok: false, statut: 409, raison: expect.stringContaining("1 plans sur 1") });
    expect(lancements()).toHaveLength(1);
  });

  it("Google en panne pendant le suivi : l'opération est gardée, et reprise au passage suivant", async () => {
    film.creer();
    google.repondre(lancementAccepte(), { statut: 503, corps: null }, termine(google.base), { statut: 200, video: true });
    await genererUnPlan("saya", "flacon", film.lieux);
    expect(await suivreLePlan("saya", "flacon", film.lieux)).toMatchObject({ plan: { etat: "injoignable" } });
    expect(film.registre().operations.flacon.nom).toContain("operations/");
    expect(await suivreLePlan("saya", "flacon", film.lieux)).toMatchObject({ plan: { etat: "pret" } });
  });

  it("téléchargement raté : rien n'est cité, l'opération reste, le passage suivant réussit", async () => {
    film.creer();
    google.repondre(lancementAccepte(), termine(google.base), { statut: 200, corps: { pas: "une vidéo" } }, termine(google.base), { statut: 200, video: true });
    await genererUnPlan("saya", "flacon", film.lieux);
    expect(await suivreLePlan("saya", "flacon", film.lieux)).toMatchObject({ plan: { etat: "injoignable" } });
    expect(film.fiche().cinema?.episodes[0].scenes[0].plans[1].fichier).toBeUndefined();
    expect(await suivreLePlan("saya", "flacon", film.lieux)).toMatchObject({ plan: { etat: "pret" } });
    expect(film.registre().utilises).toBe(1);
  });

  it("vidéo expirée chez Google (48 h) : opération close, plan compté, message « facturé »", async () => {
    film.creer();
    google.repondre(lancementAccepte(), termine(google.base), { statut: 404, corps: { error: { message: "File not found" } } });
    await genererUnPlan("saya", "flacon", film.lieux);
    const reponse = await suivreLePlan("saya", "flacon", film.lieux, Date.now() + VIDEO_GARDEE_PAR_GOOGLE_MS + 60_000);
    expect(reponse).toMatchObject({ ok: true, plan: { etat: "refuse", raison: expect.stringContaining("a été facturé") } });
    expect(film.registre()).toEqual({ utilises: 1, operations: {} });
  });
});

describe("la fiche pendant la génération", () => {
  it("une retouche faite PENDANT la génération est gardée ; la découpe de l'ancienne vidéo tombe", async () => {
    const serie = serieSaya();
    serie.episodes[0].scenes[0].plans[1].fichier = "cinema/flacon.mp4";
    serie.episodes[0].scenes[0].plans[1].decoupe = { debut: 0, fin: 7.8, coupe: [4, 5] };
    film.creer(serie);
    google.repondre(lancementAccepte(), termine(google.base), { statut: 200, video: true });
    await genererUnPlan("saya", "flacon", film.lieux);

    const retouchee = film.fiche();
    retouchee.cinema!.episodes[0].titre = "L'héritage (retouché)";
    enregistrerFilm("saya", retouchee, film.lieux.fiches);
    await suivreLePlan("saya", "flacon", film.lieux);

    expect(film.fiche().cinema?.episodes[0].titre).toBe("L'héritage (retouché)");
    expect(film.fiche().cinema?.episodes[0].scenes[0].plans[1].decoupe).toBeUndefined();
  });

  it("une fiche qui cite une vidéo absente du disque n'annonce pas un plan prêt", async () => {
    const serie = serieSaya();
    serie.episodes[0].scenes[0].plans[1].fichier = "cinema/flacon.mp4";
    film.creer(serie);
    expect(await suivreLePlan("saya", "flacon", film.lieux)).toMatchObject({ ok: true, plan: { etat: "vide" } });
  });

  it("fiche devenue invalide pendant la génération : 409, l'opération attend qu'on la répare", async () => {
    film.creer();
    google.repondre(lancementAccepte());
    await genererUnPlan("saya", "flacon", film.lieux);
    const cassee = film.fiche() as unknown as Record<string, unknown>;
    cassee.musique = null;
    enregistrerFilm("saya", cassee, film.lieux.fiches);
    expect(await suivreLePlan("saya", "flacon", film.lieux)).toMatchObject({ ok: false, statut: 409 });
    expect(film.registre().operations.flacon).toBeDefined();
    expect(existsSync(join(film.lieux.public("saya"), "cinema", "flacon.mp4"))).toBe(false);
  });

  it("film, série ou plan inconnus : 404 et 400, sans appel à Google", async () => {
    expect(await genererUnPlan("inconnu", "flacon", film.lieux)).toMatchObject({ ok: false, statut: 404 });
    creerFilm("sans-serie", ficheValide(), film.lieux.fiches);
    expect(await genererUnPlan("sans-serie", "flacon", film.lieux)).toMatchObject({ ok: false, statut: 400 });
    film.creer();
    expect(await genererUnPlan("saya", "fenetre", film.lieux)).toMatchObject({ ok: false, statut: 404 });
    expect(google.appels).toHaveLength(0);
  });
});
