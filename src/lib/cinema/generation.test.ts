import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { serieSaya } from "../../../remotion/film/cinema/serie-exemple.test-utils";
import { modifierLaBible } from "./bible/stockage";
import { creerFilm, enregistrerFilm } from "../film-ecriture";
import { ecrireAtomiquement } from "../film-fichiers-deposes";
import { ficheValide } from "../film-fixtures.test-utils";
import { type FilmDeTest, filmDeTest } from "./film-de-test.test-utils";
import { VIDEO_GARDEE_PAR_GOOGLE_MS, genererUnPlan, suivreLePlan } from "./generation";
import { REQUEST_ID, type FalLocal, demarrerFalLocal, enFile as seedanceEnFile, soumissionAcceptee, termine as seedanceTermine } from "./seedance-local.test-utils";
import { type GoogleLocal, demarrerGoogleLocal, omniSansVideo, omniTermine, portraitJpeg, videoMp4 } from "./veo-local.test-utils";

let google: GoogleLocal;
let film: FilmDeTest;
beforeEach(async () => {
  google = await demarrerGoogleLocal();
  film = filmDeTest(google.base);
});
afterEach(() => google.fermer());

const lancements = () => google.appels.filter((appel) => appel.methode === "POST");
const corpsDuLancement = (index = 0) => JSON.parse(lancements()[index].corps);
// Pont minimal Gemini Omni Flash (voir veo.ts) : le prompt et les références
// vivent dans `input`, pas dans `instances[0]`.
const texteEnvoye = (index = 0) => corpsDuLancement(index).input.find((item: { type: string }) => item.type === "text").text;
const referencesEnvoyees = (index = 0) => corpsDuLancement(index).input.filter((item: { type: string }) => item.type === "image");

describe("plans avec personnage", () => {
  it("le parcours complet : Fast, portrait d'Awa en référence, prêt, fichier cité, plan compté", async () => {
    film.creer(film.donnerUnPortraitAAwa());
    google.repondre(omniTermine(google.base), { statut: 200, video: true });

    expect(await genererUnPlan("saya", "rangement", film.lieux)).toMatchObject({
      ok: true,
      plan: { etat: "en-cours" },
      budget: { utilises: 1, plafond: 20 },
      modele: { qualite: "fast", coutUsd: 0.96, pourquoi: "Awa est à l'image : Fast garde le même visage." },
    });
    expect(lancements()[0].chemin).toBe("/v1beta/interactions");
    expect(referencesEnvoyees()).toEqual([{ type: "image", data: portraitJpeg().toString("base64"), mime_type: "image/jpeg" }]);
    expect(texteEnvoye()).toContain("Awa (reference image 1)");
    expect(texteEnvoye()).toContain("Avoid: text, letters");

    expect(await suivreLePlan("saya", "rangement", film.lieux)).toMatchObject({ plan: { etat: "pret", fichier: "cinema/rangement/prise-1.mp4" } });
    expect(readFileSync(join(film.lieux.public("saya"), "cinema", "rangement", "prise-1.mp4")).equals(videoMp4())).toBe(true);
    expect(film.fiche().cinema?.episodes[0].scenes[0].plans[0].fichier).toBe("cinema/rangement/prise-1.mp4");
    expect(film.registre()).toEqual({ utilises: 1, operations: {} });
  });

  it("sans image validée dans la bible pour Awa : refusé AVANT de réserver et d'appeler Google (son visage changerait)", async () => {
    film.creer();
    expect(await genererUnPlan("saya", "rangement", film.lieux)).toEqual({ ok: false, statut: 409, raison: expect.stringContaining("Awa n'a pas encore d'image validée dans la bible") });
    expect(google.appels).toHaveLength(0);
    expect(film.registre().utilises).toBe(0);
  });

  it("une image validée dans la bible mais absente du disque est traitée comme manquante", async () => {
    film.creer();
    film.validerLaBiblePour("awa");
    expect(await genererUnPlan("saya", "confidence", film.lieux)).toMatchObject({ ok: false, statut: 409, raison: expect.stringContaining("absente du disque") });
    expect(google.appels).toHaveLength(0);
  });

  it("la réplique part dans le prompt du plan où Awa parle", async () => {
    film.creer(film.donnerUnPortraitAAwa());
    google.repondre(omniTermine(google.base));
    await genererUnPlan("saya", "confidence", film.lieux);
    expect(texteEnvoye()).toContain("« Ce parfum, c'est l'histoire de ma grand-mère. »");
    expect(texteEnvoye()).toContain("never speak English");
  });
});

describe("plans avec une créature citée par references", () => {
  function avecSahorValide() {
    const serie = film.donnerUnPortraitAAwa();
    serie.elements = [{ id: "sahor", type: "creature", nom: "Sahor", description: "A black and silver supernatural wolf, violet eyes." }];
    serie.episodes[0].scenes[0].plans[0].references = ["awa", "sahor"];
    ecrireAtomiquement(join(film.lieux.public("saya"), "cinema", "bible", "sahor", "face-v1.jpg"), portraitJpeg());
    modifierLaBible(film.lieux.dossier("saya"), (bible) => {
      bible.references.sahor = {
        statut: "valide",
        vues: { face: { versions: [{ n: 1, fichier: "cinema/bible/sahor/face-v1.jpg", origine: "generee", creeeLe: "2026-10-17" }], retenue: 1 } },
        journal: [{ action: "validation", le: "2026-10-17" }],
      };
    });
    return serie;
  }

  it("envoie les deux images de référence (Awa puis Sahor) et nomme Sahor dans le prompt", async () => {
    film.creer(avecSahorValide());
    google.repondre(omniTermine(google.base));
    expect(await genererUnPlan("saya", "rangement", film.lieux)).toMatchObject({ ok: true, modele: { qualite: "fast" } });
    expect(referencesEnvoyees()).toHaveLength(2);
    expect(texteEnvoye()).toContain("Awa (reference image 1)");
    expect(texteEnvoye()).toContain("Sahor (reference image 2)");
    expect(texteEnvoye()).toContain("supernatural wolf");
  });

  it("Sahor sans image validée refuse le plan, même si Awa l'est", async () => {
    const serie = film.donnerUnPortraitAAwa();
    serie.elements = [{ id: "sahor", type: "creature", nom: "Sahor", description: "A black and silver supernatural wolf." }];
    serie.episodes[0].scenes[0].plans[0].references = ["awa", "sahor"];
    film.creer(serie);
    expect(await genererUnPlan("saya", "rangement", film.lieux)).toMatchObject({ ok: false, statut: 409, raison: expect.stringContaining("Sahor n'a pas encore d'image validée") });
    expect(google.appels).toHaveLength(0);
  });
});

describe("textes d'exemple", () => {
  it("un plan dont la consigne, le décor ou la description d'Awa est encore l'exemple est refusé AVANT de payer", async () => {
    const { EXEMPLES_DE_SERIE } = await import("../../../remotion/film/cinema/exemples");
    const serie = film.donnerUnPortraitAAwa();
    serie.episodes[0].scenes[0].plans[1].consigne = EXEMPLES_DE_SERIE.consigne;
    serie.episodes[0].scenes[1].decor = EXEMPLES_DE_SERIE.decor;
    serie.personnages[0].description = EXEMPLES_DE_SERIE.description;
    film.creer(serie);
    expect(await genererUnPlan("saya", "flacon", film.lieux)).toMatchObject({ ok: false, statut: 400, raison: expect.stringContaining("ce qui se passe dans ce plan") });
    expect(await genererUnPlan("saya", "confidence", film.lieux)).toMatchObject({ ok: false, statut: 400, raison: expect.stringContaining("décor de la scène") });
    expect(await genererUnPlan("saya", "rangement", film.lieux)).toMatchObject({ ok: false, statut: 400, raison: expect.stringContaining("Décris d'abord Awa") });
    expect(google.appels).toHaveLength(0);
    expect(film.registre().utilises).toBe(0);
  });
});

describe("plans sans personnage", () => {
  it("Lite, sans portrait ni negativePrompt (Lite les refuse), interdits dans le prompt", async () => {
    film.creer();
    google.repondre(omniTermine(google.base));
    expect(await genererUnPlan("saya", "flacon", film.lieux)).toMatchObject({ ok: true, modele: { qualite: "lite", coutUsd: 0.64 } });
    expect(lancements()[0].chemin).toBe("/v1beta/interactions");
    expect(referencesEnvoyees()).toHaveLength(0);
    expect(texteEnvoye()).toContain("Avoid: text, letters");
  });
});

describe("argent et reprise", () => {
  it("le double clic ne lance (et ne paie) qu'une génération", async () => {
    film.creer();
    google.repondre(omniTermine(google.base));
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

  it("plan refusé par le filtre de Google : rien n'est facturé, et on peut relancer", async () => {
    // Pont minimal (voir veo.ts) : Omni répond du premier coup, un refus de
    // contenu ne se voit donc plus à un sondage séparé mais dès le lancement.
    film.creer();
    google.repondre(omniSansVideo(), omniTermine(google.base));
    expect(await genererUnPlan("saya", "flacon", film.lieux)).toMatchObject({ ok: false, statut: 502 });
    expect(film.registre().utilises).toBe(0);
    expect(await genererUnPlan("saya", "flacon", film.lieux)).toMatchObject({ ok: true, plan: { etat: "en-cours" } });
  });

  it("budget atteint : le deuxième plan est refusé AVANT d'appeler Google", async () => {
    film.creer({ ...film.donnerUnPortraitAAwa(), budget: 1 });
    google.repondre(omniTermine(google.base));
    await genererUnPlan("saya", "flacon", film.lieux);
    expect(await genererUnPlan("saya", "rangement", film.lieux)).toEqual({ ok: false, statut: 409, raison: expect.stringContaining("1 plans sur 1") });
    expect(lancements()).toHaveLength(1);
  });

  it("Google en panne pendant le téléchargement : l'opération est gardée, et reprise au passage suivant", async () => {
    // Omni répond du premier coup (voir veo.ts) : plus de sondage séparé à
    // faire échouer, seul le téléchargement de la vidéo peut encore rater.
    film.creer();
    google.repondre(omniTermine(google.base), { statut: 503, corps: null }, { statut: 200, video: true });
    await genererUnPlan("saya", "flacon", film.lieux);
    expect(await suivreLePlan("saya", "flacon", film.lieux)).toMatchObject({ plan: { etat: "injoignable" } });
    expect(film.registre().operations.flacon.nom).toContain("omni-pret:");
    expect(await suivreLePlan("saya", "flacon", film.lieux)).toMatchObject({ plan: { etat: "pret" } });
  });

  it("téléchargement raté : rien n'est cité, l'opération reste, le passage suivant réussit", async () => {
    film.creer();
    google.repondre(omniTermine(google.base), { statut: 200, corps: { pas: "une vidéo" } }, { statut: 200, video: true });
    await genererUnPlan("saya", "flacon", film.lieux);
    expect(await suivreLePlan("saya", "flacon", film.lieux)).toMatchObject({ plan: { etat: "injoignable" } });
    expect(film.fiche().cinema?.episodes[0].scenes[0].plans[1].fichier).toBeUndefined();
    expect(await suivreLePlan("saya", "flacon", film.lieux)).toMatchObject({ plan: { etat: "pret" } });
    expect(film.registre().utilises).toBe(1);
  });

  it("vidéo expirée chez Google (48 h) : opération close, plan compté, message « facturé »", async () => {
    film.creer();
    google.repondre(omniTermine(google.base), { statut: 404, corps: { error: { message: "File not found" } } });
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
    google.repondre(omniTermine(google.base), { statut: 200, video: true });
    await genererUnPlan("saya", "flacon", film.lieux);

    const retouchee = film.fiche();
    retouchee.cinema!.episodes[0].titre = "L'héritage (retouché)";
    enregistrerFilm("saya", retouchee, film.lieux.fiches);
    await suivreLePlan("saya", "flacon", film.lieux);

    expect(film.fiche().cinema?.episodes[0].titre).toBe("L'héritage (retouché)");
    expect(film.fiche().cinema?.episodes[0].scenes[0].plans[1].decoupe).toBeUndefined();
  });

  it("refaire un plan déjà généré garde l'ancienne prise dans l'historique et retient la nouvelle", async () => {
    const serie = serieSaya();
    serie.episodes[0].scenes[0].plans[1].fichier = "cinema/flacon.mp4";
    film.creer(serie);
    google.repondre(omniTermine(google.base), { statut: 200, video: true });
    await genererUnPlan("saya", "flacon", film.lieux);

    expect(await suivreLePlan("saya", "flacon", film.lieux)).toMatchObject({ plan: { etat: "pret", fichier: "cinema/flacon/prise-2.mp4" } });
    expect(film.fiche().cinema?.episodes[0].scenes[0].plans[1].fichier).toBe("cinema/flacon/prise-2.mp4");
    const prises = film.prises().plans.flacon;
    expect(prises.map((p) => p.n)).toEqual([1, 2]);
    expect(prises.find((p) => p.n === 1)?.fichier).toBe("cinema/flacon.mp4");
    expect(prises.find((p) => p.n === 2)?.fichier).toBe("cinema/flacon/prise-2.mp4");
  });

  it("une fiche qui cite une vidéo absente du disque n'annonce pas un plan prêt", async () => {
    const serie = serieSaya();
    serie.episodes[0].scenes[0].plans[1].fichier = "cinema/flacon.mp4";
    film.creer(serie);
    expect(await suivreLePlan("saya", "flacon", film.lieux)).toMatchObject({ ok: true, plan: { etat: "vide" } });
  });

  it("fiche devenue invalide pendant la génération : 409, l'opération attend qu'on la répare", async () => {
    film.creer();
    google.repondre(omniTermine(google.base));
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

describe("Seedance (fournisseur explicite sur le plan)", () => {
  let fal: FalLocal;
  let filmAvecFal: FilmDeTest;
  beforeEach(async () => {
    fal = await demarrerFalLocal();
    filmAvecFal = filmDeTest(google.base, fal.base);
  });
  afterEach(() => fal.fermer());

  it("le parcours complet : lancé, suivi et téléchargé chez fal.ai, pas de prix fixe affiché", async () => {
    const serie = serieSaya();
    serie.episodes[0].scenes[0].plans[1].fournisseur = "seedance";
    filmAvecFal.creer(serie);
    fal.repondre(soumissionAcceptee());

    const lancement = await genererUnPlan("saya", "flacon", filmAvecFal.lieux);
    expect(lancement).toMatchObject({ ok: true, plan: { etat: "en-cours" }, modele: { fournisseur: "seedance", coutUsd: null } });
    expect(fal.appels[0].chemin).toBe("/bytedance/seedance-2.5/us/reference-to-video");
    expect(google.appels).toHaveLength(0);

    fal.repondre(seedanceEnFile());
    expect(await suivreLePlan("saya", "flacon", filmAvecFal.lieux)).toMatchObject({ plan: { etat: "en-cours" } });
    fal.repondre(...seedanceTermine(fal.base), { statut: 200, video: true });
    expect(await suivreLePlan("saya", "flacon", filmAvecFal.lieux)).toMatchObject({ plan: { etat: "pret", fichier: "cinema/flacon/prise-1.mp4" } });
    expect(readFileSync(join(filmAvecFal.lieux.public("saya"), "cinema", "flacon", "prise-1.mp4")).equals(videoMp4())).toBe(true);
    expect(filmAvecFal.registre()).toEqual({ utilises: 1, operations: {} });
  });

  it("sans clé fal.ai : 412, et rien n'est réservé — Veo reste intact", async () => {
    const serie = serieSaya();
    serie.episodes[0].scenes[0].plans[1].fournisseur = "seedance";
    filmAvecFal.creer(serie);
    expect(await genererUnPlan("saya", "flacon", { ...filmAvecFal.lieux, fal: () => null })).toMatchObject({ ok: false, statut: 412, raison: expect.stringContaining("fal.ai") });
    expect(filmAvecFal.registre().utilises).toBe(0);
    expect(fal.appels).toHaveLength(0);
  });

  it("le suivi reste chez fal.ai même si le plan repasse sur Veo entre-temps (le lancement fait foi)", async () => {
    const serie = serieSaya();
    serie.episodes[0].scenes[0].plans[1].fournisseur = "seedance";
    filmAvecFal.creer(serie);
    fal.repondre(soumissionAcceptee());
    await genererUnPlan("saya", "flacon", filmAvecFal.lieux);

    // La personne change d'avis sur l'écran AVANT que la génération ne finisse.
    const fiche = filmAvecFal.fiche();
    fiche.cinema!.episodes[0].scenes[0].plans[1].fournisseur = "veo";
    enregistrerFilm("saya", fiche, filmAvecFal.lieux.fiches);

    fal.repondre(...seedanceTermine(fal.base), { statut: 200, video: true });
    expect(await suivreLePlan("saya", "flacon", filmAvecFal.lieux)).toMatchObject({ plan: { etat: "pret" } });
    expect(google.appels).toHaveLength(0);
  });

  it("une panne PASSAGÈRE de fal.ai sur un plan déjà terminé (donc facturé) ne le rend PAS au budget", async () => {
    const serie = serieSaya();
    serie.episodes[0].scenes[0].plans[1].fournisseur = "seedance";
    filmAvecFal.creer(serie);
    fal.repondre(soumissionAcceptee());
    await genererUnPlan("saya", "flacon", filmAvecFal.lieux);

    fal.repondre({ statut: 200, corps: { status: "COMPLETED" } }, { statut: 502, corps: null });
    expect(await suivreLePlan("saya", "flacon", filmAvecFal.lieux)).toMatchObject({ plan: { etat: "injoignable" } });
    // Toujours compté : une panne passagère chez fal.ai n'efface pas un plan payé.
    expect(filmAvecFal.registre().utilises).toBe(1);
    expect(filmAvecFal.registre().operations.flacon.nom).toBe(REQUEST_ID);

    fal.repondre(...seedanceTermine(fal.base), { statut: 200, video: true });
    expect(await suivreLePlan("saya", "flacon", filmAvecFal.lieux)).toMatchObject({ plan: { etat: "pret" } });
    expect(filmAvecFal.registre()).toEqual({ utilises: 1, operations: {} });
  });
});
