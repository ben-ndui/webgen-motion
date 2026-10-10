import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { MESSAGE_SANS_BIBLIOTHEQUE, resumerFilm } from "./film-etat";
import {
  deposerBibliotheque,
  deposerMedias,
  dossierJetable,
  ecrireFiche,
  ficheSansBibliotheque,
  ficheValide,
} from "./film-fixtures.test-utils";
import { chargerFilm } from "./film-loader";
import { etatDesMedias, problemesDeMedias } from "./film-medias";
import { lireRequeteDeRendu, preparerRendu } from "./film-rendu";
import { estTypeDeRendu, fichiersDuRendu, urlDuRendu } from "./film-store";

// La bibliothèque de plans dans le mode « Film de marque » : ses médias, son
// rendu (composition `Bibliotheque`) et ses fichiers, à côté de ceux du film.

function scene() {
  const racine = dossierJetable("bibliotheque");
  const fiches = join(racine, "films");
  const lieux = { public: join(racine, "public"), sortie: join(racine, "out") };
  mkdirSync(fiches);
  return { fiches, lieux };
}

describe("noms des fichiers et URL", () => {
  it("le rendu de bibliothèque a ses propres fichiers, qu'aucune déclinaison ne peut écraser", () => {
    const film = fichiersDuRendu("/out", "Court-FR");
    const bibliotheque = fichiersDuRendu("/out", "Court-FR", "bibliotheque");
    expect(film.livrable).toBe("/out/Court-FR.mp4");
    expect(bibliotheque).toEqual({
      livrable: "/out/Court-FR.bibliotheque.mp4",
      partiel: "/out/.Court-FR.bibliotheque.en-cours.mp4",
      verrou: "/out/.Court-FR.bibliotheque.verrou",
    });
  });

  it("l'URL du lecteur dit quel rendu servir", () => {
    expect(urlDuRendu("kotizo", "Court-FR")).not.toContain("rendu=");
    expect(urlDuRendu("kotizo", "Court-FR", 7, "bibliotheque")).toBe(
      "/api/motion/film/video?id=kotizo&declinaison=Court-FR&rendu=bibliotheque&t=7",
    );
  });

  it("seuls « film » et « bibliotheque » sont des types de rendu", () => {
    expect(estTypeDeRendu("film")).toBe(true);
    expect(estTypeDeRendu("bibliotheque")).toBe(true);
    for (const autre of ["Film", "apercu", "", null, 3]) expect(estTypeDeRendu(autre)).toBe(false);
  });
});

describe("lecture de la requête", () => {
  it("le type de rendu vaut « film » par défaut et accepte « bibliotheque »", () => {
    expect(lireRequeteDeRendu({ filmId: "k", declinaison: "Court-FR" })).toMatchObject({ requete: { rendu: "film" } });
    expect(lireRequeteDeRendu({ filmId: "k", declinaison: "Court-FR", rendu: "bibliotheque" })).toMatchObject({
      ok: true,
      requete: { rendu: "bibliotheque" },
    });
  });

  it.each(["Bibliotheque", "apercu", "", 1])("refuse le type %j", (rendu) => {
    const lecture = lireRequeteDeRendu({ filmId: "k", declinaison: "Court-FR", rendu });
    expect(lecture.ok).toBe(false);
    if (!lecture.ok) expect(lecture.erreur).toMatch(/rendu invalide/);
  });
});

describe("médias de la bibliothèque", () => {
  it("ses captures bloquent la bibliothèque, pas le film", () => {
    const { lieux } = scene();
    const spec = ficheValide();
    deposerMedias(lieux.public, spec);
    const etat = etatDesMedias(spec, lieux.public, ["fr"]);
    expect(problemesDeMedias(etat, "fr", "film")).toEqual([]);
    // Les écrans de l'éventail de l'exemple sont ceux du parcours, déjà
    // déposés pour le film : seule la capture de l'adresse manque.
    expect(problemesDeMedias(etat, "fr", "bibliotheque")).toEqual([
      `capture absente : ${join(lieux.public, "ecrans-exemple", "site.png")}`,
    ]);
  });

  it("un logo fourni en image est attendu pour le film comme pour la bibliothèque", () => {
    const { lieux } = scene();
    const spec = ficheValide();
    spec.marque.logo = { type: "image", fichier: "logo/marque.png", rapport: 3, inverser: true };
    deposerMedias(lieux.public, spec);
    deposerBibliotheque(lieux.public, spec);
    const etat = etatDesMedias(spec, lieux.public, ["fr"]);
    const attendu = `logo absent : ${join(lieux.public, "logo", "marque.png")}`;
    expect(problemesDeMedias(etat, "fr", "film")).toEqual([attendu]);
    expect(problemesDeMedias(etat, "fr", "bibliotheque")).toEqual([attendu]);
  });
});

describe("préparation du rendu de bibliothèque", () => {
  it("prête quand tout est déposé : composition Bibliotheque, fichiers à part", () => {
    const { fiches, lieux } = scene();
    const spec = ficheValide();
    ecrireFiche(fiches, "demo", spec);
    deposerMedias(lieux.public, spec, ["fr"]);
    deposerBibliotheque(lieux.public, spec, ["fr"]);
    const nom = spec.declinaisons.find((declinaison) => declinaison.langue === "fr")!.nom;
    const rendu = preparerRendu("demo", nom, { dossierDesFiches: fiches, dossiers: lieux, type: "bibliotheque" });
    expect(rendu).toMatchObject({ ok: true, type: "bibliotheque", composition: "Bibliotheque" });
    if (rendu.ok) expect(rendu.sortie).toBe(join(lieux.sortie, `${nom}.bibliotheque.mp4`));
  });

  it("refuse une fiche sans bibliothèque, et le dit", () => {
    const { fiches, lieux } = scene();
    const spec = ficheSansBibliotheque();
    ecrireFiche(fiches, "demo", spec);
    deposerMedias(lieux.public, spec);
    const nom = spec.declinaisons[0]!.nom;
    const rendu = preparerRendu("demo", nom, { dossierDesFiches: fiches, dossiers: lieux, type: "bibliotheque" });
    expect(rendu).toEqual({ ok: false, statut: 400, erreurs: [MESSAGE_SANS_BIBLIOTHEQUE] });
    expect(preparerRendu("demo", nom, { dossierDesFiches: fiches, dossiers: lieux }).ok).toBe(true);
  });
});

describe("résumé et fiche", () => {
  it("chaque déclinaison porte l'état de sa bibliothèque, ou null sans bibliothèque", () => {
    const { lieux } = scene();
    const avec = resumerFilm({ id: "a", etat: "valide", spec: ficheValide() }, lieux);
    expect(avec.declinaisons[0]!.bibliotheque?.problemes.length).toBeGreaterThan(0);
    const sans = resumerFilm({ id: "b", etat: "valide", spec: ficheSansBibliotheque() }, lieux);
    expect(sans.declinaisons.every((declinaison) => declinaison.bibliotheque === null)).toBe(true);
  });

  it("une bibliothèque mal remplie rend la fiche invalide dès le chargement", () => {
    const { fiches } = scene();
    const spec = ficheValide();
    spec.bibliotheque!.eventail = ["seul.png"];
    writeFileSync(join(fiches, "demo.json"), JSON.stringify(spec));
    const fiche = chargerFilm("demo", fiches);
    expect(fiche?.etat).toBe("invalide");
    if (fiche?.etat === "invalide") expect(fiche.erreurs.join(" ")).toMatch(/bibliotheque\.eventail/);
  });
});
