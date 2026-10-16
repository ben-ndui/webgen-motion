import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { lireLigneDuRendu } from "../film-rendu";
import { CATALOGUE, FORMATS, erreursDuProjet, estCheminDeMediaSur } from "./catalogue";
import { chargerProjet, creerProjet, enregistrerProjet, listerProjets, projetDeDepart } from "./format-loader";
import { lireRequeteDeRenduDeFormat, preparerRenduDeFormat } from "./format-rendu";

const dossierTemporaire = () => mkdtempSync(join(tmpdir(), "formats-"));

/** Un projet prêt à rendre : la fiche d'exemple, marquée comme remplie, et ses médias posés. */
function projetPret(format: (typeof FORMATS)[number], paroles?: object) {
  const fiches = dossierTemporaire();
  const publics = dossierTemporaire();
  const fiche = projetDeDepart(format, "essai");
  fiche.spec.exemple = false;
  creerProjet("essai", fiche, fiches);
  for (const media of (CATALOGUE[format].mediasAttendus as (s: unknown) => string[])(fiche.spec)) {
    mkdirSync(join(publics, media, ".."), { recursive: true });
    writeFileSync(join(publics, media), media.endsWith(".json") ? JSON.stringify(paroles) : "x");
  }
  return { fiches, publics, fiche };
}

describe("le catalogue des formats", () => {
  it("décrit chaque format, et chaque fiche d'exemple est un projet valide", () => {
    expect(Object.keys(CATALOGUE).sort()).toEqual([...FORMATS].sort());
    for (const format of FORMATS) expect(erreursDuProjet(projetDeDepart(format, "essai"))).toEqual([]);
  });

  it("refuse un format inconnu", () => {
    expect(erreursDuProjet({ format: "typo-3d", spec: {} })).toEqual(["format : l'un de explainer, conte, karaoke"]);
  });

  it("garde chaque chemin de média DANS le dossier du projet", () => {
    expect(estCheminDeMediaSur("karaoke/wes/morceau.mp3")).toBe(true);
    expect(estCheminDeMediaSur("musique/Summer House.mp3")).toBe(true);
    for (const fuite of ["../../.ssh/id_rsa", "/etc/passwd", "a/../../b", "~/x", ""]) expect(estCheminDeMediaSur(fuite)).toBe(false);
    const projet = projetDeDepart("karaoke", "essai");
    if (projet.format !== "karaoke") throw new Error("karaoké attendu");
    projet.spec.paroles = "../../secrets.json";
    expect(erreursDuProjet(projet)).toEqual(["chemin de média refusé : « ../../secrets.json » (relatif au projet, sans « .. »)"]);
  });
});

describe("les projets sur le disque", () => {
  it("crée un projet, refuse un doublon, et le relit", () => {
    const dossier = dossierTemporaire();
    expect(creerProjet("mon-conte", projetDeDepart("conte", "mon-conte"), dossier)).toEqual({ ok: true, erreurs: [] });
    expect(creerProjet("mon-conte", projetDeDepart("conte", "mon-conte"), dossier)).toMatchObject({ ok: false, statut: 409 });
    expect(chargerProjet("mon-conte", dossier)).toMatchObject({ etat: "valide", fiche: { format: "conte", spec: { sujet: "mon-conte" } } });
  });

  it("enregistre un projet incomplet avec ses erreurs, mais ne change jamais son format", () => {
    const dossier = dossierTemporaire();
    creerProjet("essai", projetDeDepart("explainer", "essai"), dossier);
    const incomplet = { format: "explainer", spec: { ...projetDeDepart("explainer", "essai").spec, sujet: "" } };
    const resultat = enregistrerProjet("essai", incomplet, dossier);
    expect(resultat.ok && resultat.erreurs.length).toBeGreaterThan(0);
    expect(enregistrerProjet("essai", projetDeDepart("conte", "essai"), dossier)).toMatchObject({ ok: false, raison: "Le format d'un projet ne change pas" });
    expect(enregistrerProjet("absent", projetDeDepart("conte", "x"), dossier)).toMatchObject({ ok: false, statut: 404 });
  });

  it("liste aussi les projets illisibles, avec leurs erreurs (une erreur avalée ressemble à du vide)", () => {
    const dossier = dossierTemporaire();
    writeFileSync(join(dossier, "casse.json"), "{ pas du json");
    creerProjet("bon", projetDeDepart("conte", "bon"), dossier);
    const projets = listerProjets(dossier);
    expect(projets.map((p) => [p.id, p.etat])).toEqual([["bon", "valide"], ["casse", "invalide"]]);
  });
});

describe("avant de rendre un format", () => {
  it("lit une requête de deux noms sûrs, rien d'autre", () => {
    expect(lireRequeteDeRenduDeFormat({ id: "../x", declinaison: "Conte-FR" })).toMatchObject({ ok: false });
    expect(lireRequeteDeRenduDeFormat({ id: "essai", declinaison: "Conte-FR" })).toEqual({ ok: true, id: "essai", declinaison: "Conte-FR" });
  });

  it("refuse le contenu d'exemple et dit chaque fichier manquant, chemin compris", () => {
    const fiches = dossierTemporaire();
    const publics = dossierTemporaire();
    creerProjet("essai", projetDeDepart("conte", "essai"), fiches);
    const refus = preparerRenduDeFormat("essai", "Conte-FR", { dossierDesFiches: fiches, dossierPublic: publics });
    expect(refus).toMatchObject({ ok: false, statut: 400 });
    if (refus.ok) return;
    expect(refus.erreurs[0]).toMatch(/contenu d'EXEMPLE/);
    expect(refus.erreurs).toContain(`fichier absent : ${join(publics, "musique/aurectheme-summer-house-583397.mp3")}`);
  });

  it("prépare un rendu complet : la bonne composition et ses trois fichiers", () => {
    const { fiches, publics } = projetPret("explainer");
    const sorties = dossierTemporaire();
    const rendu = preparerRenduDeFormat("essai", "Explainer-FR", { dossierDesFiches: fiches, dossierPublic: publics, dossierDeSortie: sorties });
    expect(rendu).toMatchObject({ ok: true, composition: "Explainer", sortie: join(sorties, "Explainer-FR.mp4") });
    expect(preparerRenduDeFormat("essai", "Inconnue", { dossierDesFiches: fiches, dossierPublic: publics })).toMatchObject({ ok: false });
  });

  it("refuse un karaoké calé sur le BROUILLON de whisper : le texte affiché est celui de l'artiste", () => {
    const lignes = [{ mots: [{ texte: "on", debut: 17.4, fin: 17.6 }] }];
    const brouillon = projetPret("karaoke", { source: "paroles-brouillon.txt", reconnus: 1, lignes });
    const refus = preparerRenduDeFormat("essai", "Karaoke-FR", { dossierDesFiches: brouillon.fiches, dossierPublic: brouillon.publics });
    expect(refus.ok).toBe(false);
    if (!refus.ok) expect(refus.erreurs[0]).toMatch(/brouillon de whisper/);
    const corrige = projetPret("karaoke", { source: "10-ans.txt", reconnus: 1, lignes });
    expect(preparerRenduDeFormat("essai", "Karaoke-FR", { dossierDesFiches: corrige.fiches, dossierPublic: corrige.publics, dossierDeSortie: dossierTemporaire() })).toMatchObject({ ok: true, composition: "Karaoke" });
  });

  it("reconnaît la bannière de début du runner des formats", () => {
    expect(lireLigneDuRendu("▶ Explainer Explainer-FR (fr, long)")).toMatchObject({ type: "phase" });
  });
});
