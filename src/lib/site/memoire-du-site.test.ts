import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { dossierJetable } from "../film-fixtures.test-utils";
import type { LectureDuSite } from "./lecture-du-site";
import { garderLaMemoire, lireLaMemoire } from "./memoire-du-site";

const LECTURE = {
  url: "https://maisonsaya.fr", titre: "Maison Saya", description: "Parfums naturels", langue: "fr", nomDuSite: "Maison Saya",
  logos: [{ url: "https://maisonsaya.fr/logo.svg", largeur: 120, hauteur: 40, source: "entete" }],
  couleurs: [], polices: ["Italiana"],
  liens: [
    { url: "https://maisonsaya.fr/boutique", texte: "Boutique", dansLeMenu: true },
    { url: "https://maisonsaya.fr/cgv", texte: "CGV", dansLeMenu: false },
  ],
  textes: { titres: ["Nos parfums"], paragraphes: ["1 200 clientes"], boutons: ["Acheter"], chiffres: ["1 200"] },
} as LectureDuSite;

function dossierDuFilm() {
  const racine = dossierJetable("memoire");
  const dossier = (id: string) => join(racine, id);
  mkdirSync(dossier("saya"), { recursive: true });
  return dossier;
}

describe("mémoire du site", () => {
  it("garde les textes et les pages du menu, pas les logos ni les couleurs", () => {
    const dossier = dossierDuFilm();
    garderLaMemoire("saya", LECTURE, dossier);
    expect(lireLaMemoire("saya", dossier)).toEqual({
      url: "https://maisonsaya.fr", titre: "Maison Saya", description: "Parfums naturels", nomDuSite: "Maison Saya",
      textes: LECTURE.textes, pages: ["Boutique"],
    });
  });

  it("site jamais lu, ou fichier abîmé : null, jamais une mémoire inventée", () => {
    const dossier = dossierDuFilm();
    expect(lireLaMemoire("saya", dossier)).toBeNull();
    writeFileSync(join(dossier("saya"), "lecture-du-site.json"), "{pas du json");
    expect(lireLaMemoire("saya", dossier)).toBeNull();
    writeFileSync(join(dossier("saya"), "lecture-du-site.json"), JSON.stringify({ titre: "sans adresse" }));
    expect(lireLaMemoire("saya", dossier)).toBeNull();
  });
});
