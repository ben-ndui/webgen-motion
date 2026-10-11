import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { creerFilm, enregistrerFilm, lireFicheBrute } from "./film-ecriture";
import { ficheDeDepart } from "./film-fiche-depart";
import { dossierJetable } from "./film-fixtures.test-utils";

const FICHE = ficheDeDepart({ nom: "Saya", langues: ["fr"], formats: ["court"], direction: "nocturne" });

describe("écriture des fiches de film", () => {
  it("crée la fiche, puis refuse de la recréer par-dessus", () => {
    const dossier = dossierJetable("films");
    expect(creerFilm("saya", FICHE, dossier)).toEqual({ ok: true, erreurs: [] });
    expect(lireFicheBrute("saya", dossier)).toEqual(FICHE);
    expect(creerFilm("saya", { autre: true }, dossier)).toMatchObject({ ok: false, statut: 409 });
    expect(lireFicheBrute("saya", dossier)).toEqual(FICHE);
  });

  it("enregistre une fiche incomplète, et rend ses erreurs au lieu de la perdre", () => {
    const dossier = dossierJetable("films");
    creerFilm("saya", FICHE, dossier);
    const incomplete = { ...FICHE, declinaisons: [] };
    const resultat = enregistrerFilm("saya", incomplete, dossier);
    expect(resultat).toMatchObject({ ok: true });
    expect(resultat.ok && resultat.erreurs).toContain("declinaisons : au moins un livrable");
    expect(lireFicheBrute("saya", dossier)).toEqual(incomplete);
    expect(readdirSync(dossier).filter((f) => f.endsWith(".tmp"))).toEqual([]);
  });

  it("refuse un nom dangereux, un film absent et une fiche qui n'est pas un objet", () => {
    const dossier = dossierJetable("films");
    expect(creerFilm("../evade", FICHE, dossier)).toMatchObject({ ok: false, statut: 400 });
    expect(existsSync(join(dossier, "..", "evade.json"))).toBe(false);
    expect(enregistrerFilm("absent", FICHE, dossier)).toMatchObject({ ok: false, statut: 404 });
    creerFilm("saya", FICHE, dossier);
    expect(enregistrerFilm("saya", [1, 2], dossier)).toMatchObject({ ok: false, statut: 400 });
    expect(enregistrerFilm("saya", null, dossier)).toMatchObject({ ok: false, statut: 400 });
  });

  it("lit une fiche cassée comme absente plutôt que de planter", () => {
    const dossier = dossierJetable("films");
    writeFileSync(join(dossier, "casse.json"), "{ pas du json");
    expect(lireFicheBrute("casse", dossier)).toBeNull();
    expect(readFileSync(join(dossier, "casse.json"), "utf-8")).toBe("{ pas du json");
  });
});
