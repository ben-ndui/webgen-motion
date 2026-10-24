import { homedir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { chargerFilm, estUneSerie, getFilmsDir, listerFilms } from "./film-loader";
import { dossierJetable, ecrireFiche, ficheValide } from "./film-fixtures.test-utils";
import { serieDeDepart } from "./cinema/edition-serie";

describe("film-loader", () => {
  it("charge une fiche valide, typée", () => {
    const dossier = dossierJetable("fiches");
    ecrireFiche(dossier, "kotizo", ficheValide());
    const fiche = chargerFilm("kotizo", dossier);
    expect(fiche?.etat).toBe("valide");
    if (fiche?.etat === "valide") expect(fiche.spec.declinaisons).toHaveLength(4);
  });

  it("remonte un JSON cassé comme une fiche invalide, pas comme une absence", () => {
    const dossier = dossierJetable("fiches");
    ecrireFiche(dossier, "casse", "{ pas du json");
    const fiche = chargerFilm("casse", dossier);
    expect(fiche?.etat).toBe("invalide");
    if (fiche?.etat === "invalide") expect(fiche.erreurs[0]).toMatch(/^JSON invalide/);
    expect(listerFilms(dossier)).toHaveLength(1);
  });

  it("remonte TOUTES les erreurs d'une fiche invalide, avec le chemin du champ", () => {
    const dossier = dossierJetable("fiches");
    const spec = ficheValide() as unknown as { musique: { tempo: number }; textes: { en: unknown } };
    spec.musique.tempo = 400;
    delete spec.textes.en;
    ecrireFiche(dossier, "faux", spec);
    const fiche = chargerFilm("faux", dossier);
    expect(fiche?.etat).toBe("invalide");
    if (fiche?.etat === "invalide") {
      expect(fiche.erreurs).toContain("textes.en : manquant");
      expect(fiche.erreurs).toContain("musique.tempo : entre 60 et 200 BPM (mesuré par npm run musique)");
    }
  });

  it("dossier films/ vide ou absent : aucun film", () => {
    expect(listerFilms(dossierJetable("vide"))).toEqual([]);
    expect(listerFilms("/chemin/qui/n-existe/pas")).toEqual([]);
  });

  it("liste par id, ignore ce qui n'est pas du JSON, signale un nom de fichier dangereux", () => {
    const dossier = dossierJetable("fiches");
    ecrireFiche(dossier, "b-film", ficheValide());
    ecrireFiche(dossier, "a-film", ficheValide());
    ecrireFiche(dossier, "nom avec espace", ficheValide());
    const fiches = listerFilms(dossier);
    expect(fiches.map((fiche) => fiche.id)).toEqual(["a-film", "b-film", "nom avec espace"]);
    expect(fiches[2]?.etat).toBe("invalide");
  });

  it("refuse un id qui sortirait du dossier, et rend null pour une fiche absente", () => {
    const dossier = dossierJetable("fiches");
    expect(chargerFilm("../etc/passwd", dossier)).toBeNull();
    expect(chargerFilm("absent", dossier)).toBeNull();
  });
});

describe("getFilmsDir — où vivent les fiches", () => {
  it("en développement : films/ à la racine du repo", () => {
    expect(getFilmsDir({})).toBe(join(process.cwd(), "films"));
  });

  it("dans l'app installée : ~/.webgen-motion/fiches, le MÊME pour le serveur et les runners", () => {
    // Le serveur (cwd standalone/) et les runners (cwd runners/) reçoivent tous deux WEBGEN_RUNNERS_DIR.
    const app = { WEBGEN_RUNNERS_DIR: "/Applications/GEN MOTION.app/Contents/Resources/runners" };
    expect(getFilmsDir(app)).toBe(join(homedir(), ".webgen-motion", "fiches"));
    expect(getFilmsDir(app)).not.toContain(".app");
  });

  it("WEBGEN_FILMS_DIR l'emporte, pour les tests et les cas particuliers", () => {
    expect(getFilmsDir({ WEBGEN_FILMS_DIR: "/tmp/fiches", WEBGEN_RUNNERS_DIR: "/x" })).toBe("/tmp/fiches");
  });
});

describe("estUneSerie — profil d'interface « série »", () => {
  it("un film sans cinema n'est pas une série", () => {
    expect(estUneSerie({ id: "x", etat: "valide", spec: ficheValide() })).toBe(false);
  });

  it("un film avec une série (bible importée ou écrite) en est une", () => {
    const spec = ficheValide();
    spec.cinema = serieDeDepart();
    expect(estUneSerie({ id: "x", etat: "valide", spec })).toBe(true);
  });

  it("une fiche invalide n'est jamais une série, même avec des erreurs sans rapport", () => {
    expect(estUneSerie({ id: "x", etat: "invalide", erreurs: ["peu importe"] })).toBe(false);
  });
});
