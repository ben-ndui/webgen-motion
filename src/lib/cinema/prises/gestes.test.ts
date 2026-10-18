import { existsSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

import { serieSaya } from "../../../../remotion/film/cinema/serie-exemple.test-utils";
import { ecrireAtomiquement } from "../../film-fichiers-deposes";
import { type FilmDeTest, filmDeTest } from "../film-de-test.test-utils";
import { ajouterUnePrise, lesPrisesDuPlan, retenirUnePrise, supprimerUnePrise } from "./gestes";

let film: FilmDeTest;
beforeEach(() => {
  // Ces gestes ne parlent jamais à Veo : l'adresse n'a pas besoin d'exister.
  film = filmDeTest("http://inutilise.test");
});

const ecrireLaVideo = (chemin: string) => ecrireAtomiquement(join(film.lieux.public("saya"), chemin), new Uint8Array([1, 2, 3]));

describe("lesPrisesDuPlan — migration transparente de l'ancien fichier unique", () => {
  it("un plan jamais généré n'a aucune prise", () => {
    film.creer();
    expect(lesPrisesDuPlan("saya", "flacon", film.lieux)).toMatchObject({ ok: true, prises: [] });
  });

  it("un plan d'avant les prises multiples devient sa prise 1, retenue", () => {
    const serie = serieSaya();
    serie.episodes[0].scenes[0].plans[1].fichier = "cinema/flacon.mp4";
    film.creer(serie);
    ecrireLaVideo("cinema/flacon.mp4");
    const reponse = lesPrisesDuPlan("saya", "flacon", film.lieux);
    expect(reponse).toMatchObject({ ok: true, prises: [{ n: 1, fichier: "cinema/flacon.mp4", retenue: true, presente: true }] });
  });
});

describe("ajouterUnePrise", () => {
  it("la première prise d'un plan sans vidéo est retenue tout de suite", () => {
    film.creer();
    ecrireLaVideo("cinema/flacon/prise-1.mp4");
    const ajout = ajouterUnePrise("saya", "flacon", { n: 1, fichier: "cinema/flacon/prise-1.mp4", creeeLe: "2026-10-17" }, film.lieux);
    expect(ajout).toEqual({ ok: true, retenue: true });
    expect(film.fiche().cinema?.episodes[0].scenes[0].plans[1].fichier).toBe("cinema/flacon/prise-1.mp4");
  });

  it("une prise de plus quand une est déjà retenue s'ajoute SANS remplacer celle de l'épisode", () => {
    const serie = serieSaya();
    serie.episodes[0].scenes[0].plans[1].fichier = "cinema/flacon.mp4";
    film.creer(serie);
    ecrireLaVideo("cinema/flacon/prise-2.mp4");
    const ajout = ajouterUnePrise("saya", "flacon", { n: 2, fichier: "cinema/flacon/prise-2.mp4", creeeLe: "2026-10-17" }, film.lieux);
    expect(ajout).toEqual({ ok: true, retenue: false });
    // L'épisode joue toujours l'ancienne : rien n'a bougé dans la fiche.
    expect(film.fiche().cinema?.episodes[0].scenes[0].plans[1].fichier).toBe("cinema/flacon.mp4");
    expect(lesPrisesDuPlan("saya", "flacon", film.lieux)).toMatchObject({ prises: [{ n: 1, retenue: true }, { n: 2, retenue: false }] });
  });

  it("rejouer l'ajout de la même prise (téléchargement retenté) ne la duplique pas", () => {
    film.creer();
    ecrireLaVideo("cinema/flacon/prise-1.mp4");
    const prise = { n: 1, fichier: "cinema/flacon/prise-1.mp4", creeeLe: "2026-10-17" };
    ajouterUnePrise("saya", "flacon", prise, film.lieux);
    ajouterUnePrise("saya", "flacon", prise, film.lieux);
    expect(lesPrisesDuPlan("saya", "flacon", film.lieux)).toMatchObject({ prises: [{ n: 1 }] });
  });
});

describe("retenirUnePrise", () => {
  function deuxPrises(): void {
    const serie = serieSaya();
    serie.episodes[0].scenes[0].plans[1].fichier = "cinema/flacon.mp4";
    serie.episodes[0].scenes[0].plans[1].decoupe = { debut: 0, fin: 7.8 };
    film.creer(serie);
    ecrireLaVideo("cinema/flacon.mp4");
    ecrireLaVideo("cinema/flacon/prise-2.mp4");
    ajouterUnePrise("saya", "flacon", { n: 2, fichier: "cinema/flacon/prise-2.mp4", creeeLe: "2026-10-17" }, film.lieux);
  }

  it("fait passer une autre prise dans l'épisode, et échange les découpes", () => {
    deuxPrises();
    expect(retenirUnePrise("saya", "flacon", 2, film.lieux)).toMatchObject({ ok: true, plan: { fichier: "cinema/flacon/prise-2.mp4" } });
    const fiche = film.fiche().cinema?.episodes[0].scenes[0].plans[1];
    expect(fiche?.fichier).toBe("cinema/flacon/prise-2.mp4");
    // La découpe de la prise 1 (qui sort) est partie avec elle, pas réutilisée pour la 2.
    expect(fiche?.decoupe).toBeUndefined();
    expect(lesPrisesDuPlan("saya", "flacon", film.lieux)).toMatchObject({ prises: [{ n: 1, decoupe: { debut: 0, fin: 7.8 } }, { n: 2 }] });
  });

  it("refuse une prise qui n'existe pas", () => {
    deuxPrises();
    expect(retenirUnePrise("saya", "flacon", 9, film.lieux)).toMatchObject({ ok: false, statut: 404 });
  });

  it("refuse de retenir une prise dont la vidéo a disparu du disque", () => {
    const serie = serieSaya();
    serie.episodes[0].scenes[0].plans[1].fichier = "cinema/flacon.mp4";
    film.creer(serie);
    ecrireLaVideo("cinema/flacon.mp4");
    // prise 2 ajoutée côté registre, mais sa vidéo n'a jamais été écrite (échec de téléchargement).
    ajouterUnePrise("saya", "flacon", { n: 2, fichier: "cinema/flacon/prise-2.mp4", creeeLe: "2026-10-17" }, film.lieux);
    expect(retenirUnePrise("saya", "flacon", 2, film.lieux)).toMatchObject({ ok: false, statut: 409 });
  });

  it("retenir la prise déjà en place ne touche à rien", () => {
    deuxPrises();
    expect(retenirUnePrise("saya", "flacon", 1, film.lieux)).toMatchObject({ ok: true, plan: { fichier: "cinema/flacon.mp4" } });
  });
});

describe("supprimerUnePrise", () => {
  it("refuse de supprimer la prise retenue", () => {
    const serie = serieSaya();
    serie.episodes[0].scenes[0].plans[1].fichier = "cinema/flacon.mp4";
    film.creer(serie);
    ecrireLaVideo("cinema/flacon.mp4");
    expect(supprimerUnePrise("saya", "flacon", 1, film.lieux)).toMatchObject({ ok: false, statut: 409 });
  });

  it("supprime une prise non retenue et efface sa vidéo", () => {
    const serie = serieSaya();
    serie.episodes[0].scenes[0].plans[1].fichier = "cinema/flacon.mp4";
    film.creer(serie);
    ecrireLaVideo("cinema/flacon.mp4");
    ecrireLaVideo("cinema/flacon/prise-2.mp4");
    ajouterUnePrise("saya", "flacon", { n: 2, fichier: "cinema/flacon/prise-2.mp4", creeeLe: "2026-10-17" }, film.lieux);
    const chemin = join(film.lieux.public("saya"), "cinema/flacon/prise-2.mp4");
    expect(existsSync(chemin)).toBe(true);
    expect(supprimerUnePrise("saya", "flacon", 2, film.lieux)).toMatchObject({ ok: true, prises: [{ n: 1 }] });
    expect(existsSync(chemin)).toBe(false);
  });
});
