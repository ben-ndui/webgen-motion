import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { monterLEpisode } from "../../../remotion/film/cinema/montage";
import { serieSaya } from "../../../remotion/film/cinema/serie-exemple.test-utils";
import { erreursDuCinema } from "../../../remotion/film/cinema/validerCinema";
import { garderLesChampsDuServeur } from "./champs-du-serveur";
import { type FilmDeTest, filmDeTest } from "./film-de-test.test-utils";
import { genererUnPlan, suivreLePlan } from "./generation";
import { deposerLaPhotoDuProduit, retirerLaPhotoDuProduit } from "./photo-du-produit";
import { type GoogleLocal, demarrerGoogleLocal, lancementAccepte, portraitJpeg, termine } from "./veo-local.test-utils";

const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d2a5b40000000049454e44ae426082", "hex");
let google: GoogleLocal;
let film: FilmDeTest;
beforeEach(async () => {
  google = await demarrerGoogleLocal();
  film = filmDeTest(google.base);
});
afterEach(() => google.fermer());
const photoSurLeDisque = (nom: string) => join(film.lieux.public("saya"), "cinema", nom);

describe("dépôt de la photo du produit", () => {
  it("écrit la photo et la cite ; un PNG remplace ensuite le JPEG ; retirer l'enlève", () => {
    film.creer();
    expect(deposerLaPhotoDuProduit("saya", portraitJpeg(), film.lieux)).toEqual({ ok: true, photo: "cinema/objet.jpg" });
    expect(readFileSync(photoSurLeDisque("objet.jpg")).equals(portraitJpeg())).toBe(true);
    expect(film.fiche().cinema?.photoDeLObjet).toBe("cinema/objet.jpg");
    expect(deposerLaPhotoDuProduit("saya", PNG, film.lieux)).toEqual({ ok: true, photo: "cinema/objet.png" });
    expect(existsSync(photoSurLeDisque("objet.jpg"))).toBe(false);
    expect(retirerLaPhotoDuProduit("saya", film.lieux)).toEqual({ ok: true, photo: null });
    expect(existsSync(photoSurLeDisque("objet.png"))).toBe(false);
    expect(film.fiche().cinema?.photoDeLObjet).toBeUndefined();
  });

  it("refuse ce qui n'est pas une image, un fichier vide, ou une photo sans produit décrit", () => {
    film.creer();
    expect(deposerLaPhotoDuProduit("saya", Buffer.from("<html>"), film.lieux)).toMatchObject({ ok: false, statut: 400 });
    expect(deposerLaPhotoDuProduit("saya", new Uint8Array(), film.lieux)).toMatchObject({ ok: false, statut: 400 });
    const sansObjet = serieSaya();
    delete sansObjet.objet;
    sansObjet.episodes[0].scenes[0].plans.forEach((p) => (p.objet = false));
    const autre = filmDeTest(google.base);
    autre.creer(sansObjet);
    expect(deposerLaPhotoDuProduit("saya", portraitJpeg(), autre.lieux)).toMatchObject({ ok: false, statut: 400, raison: expect.stringContaining("Décris d'abord le produit") });
  });
});

describe("la photo dans la génération", () => {
  const lancements = () => google.appels.filter((a) => a.methode === "POST").map((a) => JSON.parse(a.corps));

  it("objet seul : Fast, la photo en référence, et le plan est marqué « vrai produit »", async () => {
    film.creer();
    deposerLaPhotoDuProduit("saya", portraitJpeg(), film.lieux);
    google.repondre(lancementAccepte(), termine(google.base), { statut: 200, video: true });
    expect(await genererUnPlan("saya", "flacon", film.lieux)).toMatchObject({ ok: true, modele: { qualite: "fast", pourquoi: expect.stringContaining("photo du vrai produit") } });
    const instance = lancements()[0].instances[0];
    expect(instance.referenceImages).toHaveLength(1);
    expect(instance.prompt).toContain("The real product (reference image 1)");
    await suivreLePlan("saya", "flacon", film.lieux);
    expect(film.fiche().cinema?.episodes[0].scenes[0].plans[1].produitReel).toBe(true);
  });

  it("avec Awa : son portrait d'abord, la photo ensuite (« reference image 2 »)", async () => {
    film.creer(film.donnerUnPortraitAAwa());
    deposerLaPhotoDuProduit("saya", PNG, film.lieux);
    google.repondre(lancementAccepte());
    await genererUnPlan("saya", "rangement", film.lieux);
    const instance = lancements()[0].instances[0];
    expect(instance.referenceImages.map((r: { image: { mimeType: string } }) => r.image.mimeType)).toEqual(["image/jpeg", "image/png"]);
    expect(instance.prompt).toContain("The real product (reference image 2)");
  });

  it("photo citée mais absente du disque : refus AVANT de payer", async () => {
    const serie = serieSaya();
    serie.photoDeLObjet = "cinema/objet.jpg";
    film.creer(serie);
    expect(await genererUnPlan("saya", "flacon", film.lieux)).toMatchObject({ ok: false, statut: 409, raison: expect.stringContaining("photo du produit") });
    expect(google.appels).toHaveLength(0);
  });
});

describe("« APERÇU » plan par plan", () => {
  it("un plan généré AVANT la photo reste un objet imaginé ; seuls les plans « vrai produit » le lèvent", () => {
    const serie = serieSaya();
    serie.photoDeLObjet = "cinema/objet.jpg";
    serie.episodes[0].scenes.flatMap((s) => s.plans).forEach((p) => (p.fichier = `cinema/${p.id}.mp4`));
    expect(monterLEpisode(serie, "ep1", 120, 30).objetImagine).toBe(true);
    serie.episodes[0].scenes[0].plans.forEach((p) => (p.produitReel = true));
    expect(monterLEpisode(serie, "ep1", 120, 30).objetImagine).toBe(false);
  });

  it("le navigateur ne peut ni poser « vrai produit » ni la photo, ni les effacer", () => {
    const disque = serieSaya();
    disque.photoDeLObjet = "cinema/objet.jpg";
    disque.episodes[0].scenes[0].plans[1].produitReel = true;
    const envoyee = serieSaya();
    envoyee.episodes[0].scenes[0].plans[0].produitReel = true;
    const gardee = garderLesChampsDuServeur({ cinema: envoyee }, { cinema: disque }) as { cinema: ReturnType<typeof serieSaya> };
    expect(gardee.cinema.photoDeLObjet).toBe("cinema/objet.jpg");
    expect(gardee.cinema.episodes[0].scenes[0].plans.map((p) => p.produitReel)).toEqual([undefined, true]);
  });

  it("trois personnages + la photo dépassent les trois références de Veo : refusé par le validateur", () => {
    const serie = serieSaya();
    serie.photoDeLObjet = "cinema/objet.jpg";
    serie.personnages.push({ id: "kofi", nom: "Kofi", description: "x" }, { id: "lea", nom: "Léa", description: "x" });
    serie.episodes[0].scenes[0].plans[0].personnages = ["awa", "kofi", "lea"];
    expect(erreursDuCinema({ cinema: serie })).toEqual([
      "cinema.episodes[0].scenes[0].plans[0] : 4 images de référence (références + photo du produit), 3 au plus pour Veo",
    ]);
  });
});
