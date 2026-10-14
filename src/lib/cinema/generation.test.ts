import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { CinemaDuFilm } from "../../../remotion/film/cinema/types";
import type { FilmSpec } from "../../../remotion/film/spec";
import { creerFilm, enregistrerFilm, lireFicheBrute } from "../film-ecriture";
import { dossierJetable, ficheValide } from "../film-fixtures.test-utils";
import { VIDEO_GARDEE_PAR_GOOGLE_MS, genererUnPlan, suivreLePlan } from "./generation";
import { lireLeRegistre } from "./registre";
import { type GoogleLocal, demarrerGoogleLocal, enCours, lancementAccepte, termine, videoMp4 } from "./veo-local.test-utils";

const PERSONNAGE = "A Black woman with an elegant braided updo";

function cinema(budget?: number): CinemaDuFilm {
  return {
    personnage: PERSONNAGE,
    objet: "An amber perfume bottle with a gold hibiscus stopper",
    plans: [
      { id: "jardin", role: "scene", consigne: "She picks a red hibiscus." },
      { id: "flacon", role: "objet", consigne: "The bottle on navy velvet." },
    ],
    ...(budget ? { budget } : {}),
  };
}

let google: GoogleLocal;
let racine: string;
let lieux: Parameters<typeof genererUnPlan>[2] & object;

function nouveauFilm(c: CinemaDuFilm = cinema()): void {
  const fiche = ficheValide();
  fiche.cinema = c;
  creerFilm("saya", fiche, lieux.fiches!);
}
const fiche = () => lireFicheBrute("saya", lieux.fiches!) as FilmSpec;
const registre = () => lireLeRegistre(join(racine, "films", "saya"));
const appelsGoogle = (methode: string) => google.appels.filter((appel) => appel.methode === methode);

beforeEach(async () => {
  google = await demarrerGoogleLocal();
  racine = dossierJetable("cinema");
  lieux = {
    fiches: join(racine, "fiches"),
    dossier: (id: string) => join(racine, "films", id),
    public: (id: string) => join(racine, "films", id, "public"),
    veo: () => ({ base: google.base, cle: "cle-de-test" }),
  };
});
afterEach(() => google.fermer());

describe("genererUnPlan puis suivreLePlan", () => {
  it("le parcours complet : lancé, en cours, prêt, fichier écrit, fiche qui le cite, plan compté", async () => {
    nouveauFilm();
    google.repondre(lancementAccepte(), enCours(), termine(google.base), { statut: 200, video: true });

    expect(await genererUnPlan("saya", "jardin", lieux)).toMatchObject({ ok: true, plan: { etat: "en-cours" }, budget: { utilises: 1, plafond: 6, coutParPlanUsd: 0.96 } });
    expect(JSON.parse(google.appels[0].corps).instances[0].prompt).toContain(PERSONNAGE);
    expect(await suivreLePlan("saya", "jardin", lieux)).toMatchObject({ ok: true, plan: { etat: "en-cours" } });
    expect(await suivreLePlan("saya", "jardin", lieux)).toMatchObject({ ok: true, plan: { etat: "pret", fichier: "cinema/jardin.mp4" } });

    expect(readFileSync(join(lieux.public!("saya"), "cinema", "jardin.mp4")).equals(videoMp4())).toBe(true);
    expect(fiche().cinema?.plans[0].fichier).toBe("cinema/jardin.mp4");
    expect(registre()).toEqual({ utilises: 1, operations: {} });
    // Une fois prêt, suivre ne rappelle plus Google.
    expect(await suivreLePlan("saya", "jardin", lieux)).toMatchObject({ plan: { etat: "pret" } });
    expect(google.appels).toHaveLength(4);
  });

  it("un plan jamais lancé est « vide », sans appel à Google", async () => {
    nouveauFilm();
    expect(await suivreLePlan("saya", "jardin", lieux)).toMatchObject({ ok: true, plan: { etat: "vide" }, budget: { utilises: 0 } });
    expect(google.appels).toHaveLength(0);
  });

  it("le double clic ne lance (et ne paie) qu'une génération", async () => {
    nouveauFilm();
    google.repondre(lancementAccepte());
    await genererUnPlan("saya", "jardin", lieux);
    expect(await genererUnPlan("saya", "jardin", lieux)).toMatchObject({ ok: true, plan: { etat: "en-cours" } });
    expect(appelsGoogle("POST")).toHaveLength(1);
    expect(registre().utilises).toBe(1);
  });

  it("sans clé Gemini : 412, et rien n'est réservé", async () => {
    nouveauFilm();
    expect(await genererUnPlan("saya", "jardin", { ...lieux, veo: () => null })).toMatchObject({ ok: false, statut: 412 });
    expect(registre().utilises).toBe(0);
  });

  it("lancement refusé par Google : rien n'est compté, et le message le dit", async () => {
    nouveauFilm();
    google.repondre({ statut: 429, corps: { error: { message: "RESOURCE_EXHAUSTED" } } });
    const reponse = await genererUnPlan("saya", "jardin", lieux);
    expect(reponse).toMatchObject({ ok: false, statut: 502, raison: expect.stringContaining("Rien n'a été facturé.") });
    expect(registre()).toEqual({ utilises: 0, operations: {} });
  });

  it("plan refusé par le filtre de Google : rendu au budget, et on peut relancer", async () => {
    nouveauFilm();
    google.repondre(lancementAccepte(), { statut: 200, corps: { done: true, response: { generateVideoResponse: { raiMediaFilteredReasons: ["Unsafe."] } } } }, lancementAccepte());
    await genererUnPlan("saya", "jardin", lieux);
    expect(await suivreLePlan("saya", "jardin", lieux)).toMatchObject({ plan: { etat: "refuse", raison: expect.stringContaining("Unsafe.") }, budget: { utilises: 0 } });
    expect(await genererUnPlan("saya", "jardin", lieux)).toMatchObject({ ok: true, plan: { etat: "en-cours" } });
  });

  it("budget atteint : le deuxième plan est refusé AVANT d'appeler Google", async () => {
    nouveauFilm(cinema(1));
    google.repondre(lancementAccepte());
    await genererUnPlan("saya", "jardin", lieux);
    expect(await genererUnPlan("saya", "flacon", lieux)).toEqual({ ok: false, statut: 409, raison: expect.stringContaining("1 plans sur 1") });
    expect(appelsGoogle("POST")).toHaveLength(1);
  });

  it("Google en panne pendant le suivi : l'opération est gardée, et reprise au passage suivant", async () => {
    nouveauFilm();
    google.repondre(lancementAccepte(), { statut: 503, corps: null }, termine(google.base), { statut: 200, video: true });
    await genererUnPlan("saya", "jardin", lieux);
    expect(await suivreLePlan("saya", "jardin", lieux)).toMatchObject({ plan: { etat: "injoignable" } });
    expect(registre().operations.jardin.nom).toContain("operations/");
    expect(await suivreLePlan("saya", "jardin", lieux)).toMatchObject({ plan: { etat: "pret" } });
  });

  it("téléchargement raté : rien n'est cité, l'opération reste, le passage suivant réussit", async () => {
    nouveauFilm();
    google.repondre(lancementAccepte(), termine(google.base), { statut: 200, corps: { pas: "une vidéo" } }, termine(google.base), { statut: 200, video: true });
    await genererUnPlan("saya", "jardin", lieux);
    expect(await suivreLePlan("saya", "jardin", lieux)).toMatchObject({ plan: { etat: "injoignable" } });
    expect(fiche().cinema?.plans[0].fichier).toBeUndefined();
    expect(await suivreLePlan("saya", "jardin", lieux)).toMatchObject({ plan: { etat: "pret" } });
    expect(registre().utilises).toBe(1);
  });

  it("une retouche faite PENDANT la génération est gardée ; la découpe de l'ancienne vidéo tombe", async () => {
    const depart = cinema();
    depart.plans[0].fichier = "cinema/jardin.mp4";
    depart.plans[0].decoupe = { debut: 0, fin: 7.8, coupe: [4, 5] };
    nouveauFilm(depart);
    google.repondre(lancementAccepte(), termine(google.base), { statut: 200, video: true });
    await genererUnPlan("saya", "jardin", lieux);

    const retouchee = fiche();
    retouchee.cinema!.plans[1].consigne = "The bottle on navy velvet, gold light sweep.";
    enregistrerFilm("saya", retouchee, lieux.fiches!);
    await suivreLePlan("saya", "jardin", lieux);

    expect(fiche().cinema?.plans[1].consigne).toBe("The bottle on navy velvet, gold light sweep.");
    expect(fiche().cinema?.plans[0].decoupe).toBeUndefined();
  });

  it("fiche devenue invalide pendant la génération : 409, l'opération attend qu'on la répare", async () => {
    nouveauFilm();
    google.repondre(lancementAccepte());
    await genererUnPlan("saya", "jardin", lieux);
    const cassee = fiche() as unknown as Record<string, unknown>;
    cassee.musique = null;
    enregistrerFilm("saya", cassee, lieux.fiches!);
    expect(await suivreLePlan("saya", "jardin", lieux)).toMatchObject({ ok: false, statut: 409 });
    expect(registre().operations.jardin).toBeDefined();
    expect(existsSync(join(lieux.public!("saya"), "cinema", "jardin.mp4"))).toBe(false);
  });

  it("une fiche qui cite une vidéo absente du disque n'annonce pas un plan prêt", async () => {
    const depart = cinema();
    depart.plans[0].fichier = "cinema/jardin.mp4";
    nouveauFilm(depart);
    expect(await suivreLePlan("saya", "jardin", lieux)).toMatchObject({ ok: true, plan: { etat: "vide" } });
  });

  it("vidéo expirée chez Google (48 h) : l'opération est close, le plan reste compté, et le message dit qu'il a été facturé", async () => {
    nouveauFilm();
    google.repondre(lancementAccepte(), termine(google.base), { statut: 404, corps: { error: { message: "File not found" } } });
    await genererUnPlan("saya", "jardin", lieux);
    const reponse = await suivreLePlan("saya", "jardin", lieux, Date.now() + VIDEO_GARDEE_PAR_GOOGLE_MS + 60_000);
    expect(reponse).toMatchObject({ ok: true, plan: { etat: "refuse", raison: expect.stringContaining("a été facturé") } });
    expect(registre()).toEqual({ utilises: 1, operations: {} });
  });

  it("film, cinéma ou plan inconnus : 404 et 400, sans appel à Google", async () => {
    expect(await genererUnPlan("inconnu", "jardin", lieux)).toMatchObject({ ok: false, statut: 404 });
    creerFilm("sans-cinema", ficheValide(), lieux.fiches!);
    expect(await genererUnPlan("sans-cinema", "jardin", lieux)).toMatchObject({ ok: false, statut: 400 });
    nouveauFilm();
    expect(await genererUnPlan("saya", "fenetre", lieux)).toMatchObject({ ok: false, statut: 404 });
    expect(google.appels).toHaveLength(0);
  });
});
