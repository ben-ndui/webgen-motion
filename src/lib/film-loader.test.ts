import { describe, expect, it } from "vitest";

import { chargerFilm, listerFilms } from "./film-loader";
import { dossierJetable, ecrireFiche, ficheValide } from "./film-fixtures.test-utils";

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
