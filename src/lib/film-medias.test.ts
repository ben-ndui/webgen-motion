import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { resumerFilm } from "./film-etat";
import { deposerMedias, dossierJetable, ficheValide } from "./film-fixtures.test-utils";
import { etatDesMedias, mediasManquants, problemesDeMedias } from "./film-medias";

function dossiers() {
  const racine = dossierJetable("film");
  return { public: join(racine, "public"), sortie: join(racine, "out") };
}

describe("état des médias", () => {
  it("aucun média déposé : tout est manquant, avec le chemin exact attendu", () => {
    const spec = ficheValide();
    const { public: dossierPublic } = dossiers();
    const etat = etatDesMedias(spec, dossierPublic);
    expect(etat.medias.every((media) => !media.present)).toBe(true);
    const musique = etat.medias.find((media) => media.role === "musique");
    expect(musique?.absolu).toBe(join(dossierPublic, spec.musique.fichier));
    expect(musique?.langues).toEqual(["fr", "en"]);
    expect(problemesDeMedias(etat, "fr")[0]).toBe(`musique absente : ${join(dossierPublic, spec.musique.fichier)}`);
  });

  it("tout est déposé : rien ne manque", () => {
    const spec = ficheValide();
    const { public: dossierPublic } = dossiers();
    deposerMedias(dossierPublic, spec);
    const etat = etatDesMedias(spec, dossierPublic);
    expect(problemesDeMedias(etat, "fr")).toEqual([]);
    expect(problemesDeMedias(etat, "en")).toEqual([]);
  });

  it("une langue sans écrans ne bloque que cette langue", () => {
    const spec = ficheValide();
    const { public: dossierPublic } = dossiers();
    deposerMedias(dossierPublic, spec, ["fr"]);
    const etat = etatDesMedias(spec, dossierPublic);
    expect(mediasManquants(etat, "fr")).toEqual([]);
    expect(mediasManquants(etat, "en").length).toBeGreaterThan(0);
  });

  it("une langue sans déclinaison n'exige aucune capture", () => {
    const spec = ficheValide();
    const { public: dossierPublic } = dossiers();
    const etat = etatDesMedias(spec, dossierPublic, ["fr"]);
    expect(etat.medias.some((media) => media.relatif.startsWith("ecrans-en/"))).toBe(false);
  });

  it("refuse un chemin qui sort du dossier public, même si le fichier existe", () => {
    const spec = ficheValide();
    const { public: dossierPublic } = dossiers();
    mkdirSync(dossierPublic, { recursive: true });
    writeFileSync(join(dossierPublic, "..", "secret.mp3"), "x");
    spec.musique.fichier = "../secret.mp3";
    const musique = etatDesMedias(spec, dossierPublic).medias.find((media) => media.role === "musique");
    expect(musique).toMatchObject({ present: false, horsDuDossier: true });
  });

  it("signale deux états de l'événement identiques (le plan ne bougerait pas)", () => {
    const spec = ficheValide();
    const { public: dossierPublic } = dossiers();
    deposerMedias(dossierPublic, spec);
    const dossierFr = join(dossierPublic, spec.textes.fr.dossierDesEcrans);
    copyFileSync(join(dossierFr, spec.ecrans.evenement[0]!), join(dossierFr, spec.ecrans.evenement[1]!));
    const etat = etatDesMedias(spec, dossierPublic);
    expect(etat.doublons).toHaveLength(1);
    expect(problemesDeMedias(etat, "fr").at(-1)).toMatch(/même image/);
    expect(problemesDeMedias(etat, "en")).toEqual([]);
  });
});

describe("statut du film", () => {
  it("fiche invalide : brouillon, avec ses erreurs", () => {
    const resume = resumerFilm({ id: "x", etat: "invalide", erreurs: ["marque : objet attendu"] }, dossiers());
    expect(resume).toMatchObject({ statut: "brouillon", erreurs: ["marque : objet attendu"], declinaisons: [] });
  });

  it("fiche d'exemple : brouillon, et chaque déclinaison est bloquée", () => {
    const spec = ficheValide();
    spec.exemple = true;
    const lieux = dossiers();
    deposerMedias(lieux.public, spec);
    const resume = resumerFilm({ id: "x", etat: "valide", spec }, lieux);
    expect(resume.statut).toBe("brouillon");
    expect(resume.declinaisons.every((declinaison) => declinaison.problemes.length === 1)).toBe(true);
  });

  it("médias manquants, puis prêt, puis rendu", () => {
    const spec = ficheValide();
    const lieux = dossiers();
    expect(resumerFilm({ id: "x", etat: "valide", spec }, lieux).statut).toBe("medias-manquants");

    deposerMedias(lieux.public, spec);
    expect(resumerFilm({ id: "x", etat: "valide", spec }, lieux).statut).toBe("pret");

    mkdirSync(lieux.sortie, { recursive: true });
    writeFileSync(join(lieux.sortie, "Court-FR.mp4"), Buffer.alloc(2000));
    const resume = resumerFilm({ id: "x", etat: "valide", spec }, lieux);
    expect(resume.statut).toBe("rendu");
    expect(resume.rendus).toBe(1);
    expect(resume.declinaisons.find((d) => d.nom === "Court-FR")?.rendu?.url).toMatch(
      /^\/api\/motion\/film\/video\?id=x&declinaison=Court-FR&t=\d+$/,
    );
  });

  it("un mp4 vide ou partiel ne compte pas comme un rendu", () => {
    const spec = ficheValide();
    const lieux = dossiers();
    mkdirSync(lieux.sortie, { recursive: true });
    writeFileSync(join(lieux.sortie, "Film-FR.mp4"), Buffer.alloc(10));
    writeFileSync(join(lieux.sortie, ".Film-EN.en-cours.mp4"), Buffer.alloc(5000));
    expect(resumerFilm({ id: "x", etat: "valide", spec }, lieux).rendus).toBe(0);
  });
});
