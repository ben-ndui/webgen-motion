import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { outilsWhisper } from "../whisper";
import { projetDeDepart } from "./format-loader";
import { CHEMINS_DES_PAROLES, LONGUEUR_MAX_DES_PAROLES, enregistrerLesParoles, etatDesParoles } from "./karaoke-paroles";

const jetable = () => mkdtempSync(join(tmpdir(), "paroles-"));

describe("trouver whisper", () => {
  it("le cherche là où Homebrew l'installe, jamais par le PATH (absent de l'app lancée du Finder)", () => {
    // Le binaire est trouvé à son emplacement ; c'est ensuite le modèle qui manque (raison différente).
    const resultat = outilsWhisper({}, (chemin) => chemin === "/opt/homebrew/bin/whisper-cli");
    expect(resultat.ok).toBe(false);
    if (!resultat.ok) expect(resultat.raison).toMatch(/Aucun modèle whisper/);
  });

  it("dit ce qui manque, en clair", () => {
    expect(outilsWhisper({}, () => false)).toEqual({ ok: false, raison: "whisper.cpp n'est pas installé : dans un terminal, « brew install whisper-cpp »." });
    const sansModele = outilsWhisper({ WEBGEN_WHISPER_BIN: "/chemin/whisper-cli" }, (chemin) => chemin === "/chemin/whisper-cli");
    expect(sansModele.ok).toBe(false);
    if (!sansModele.ok) expect(sansModele.raison).toMatch(/Aucun modèle whisper/);
  });
});

describe("les fichiers de paroles d'un karaoké", () => {
  it("un projet neuf range ses fichiers sous des noms à lui, pas sous ceux de l'artiste de l'exemple", () => {
    const projet = projetDeDepart("karaoke", "clip");
    if (projet.format !== "karaoke") throw new Error("karaoké attendu");
    expect(projet.spec.paroles).toBe(CHEMINS_DES_PAROLES.calees);
    expect(projet.spec.morceau.fichier).toBe("musique/morceau.mp3");
  });

  it("lit le brouillon, le texte et le résumé des paroles calées ; rien = trois null", () => {
    const dossier = jetable();
    expect(etatDesParoles(dossier, CHEMINS_DES_PAROLES.calees)).toEqual({ brouillon: null, texte: null, calees: null, refrain: null });
    mkdirSync(join(dossier, "paroles"), { recursive: true });
    writeFileSync(join(dossier, CHEMINS_DES_PAROLES.brouillon), "on s'est donné\n");
    writeFileSync(join(dossier, CHEMINS_DES_PAROLES.calees), JSON.stringify({ source: "paroles.txt", reconnus: 0.99, lignes: [{ mots: [] }, { mots: [] }] }));
    expect(etatDesParoles(dossier, CHEMINS_DES_PAROLES.calees)).toEqual({
      brouillon: "on s'est donné\n",
      texte: null,
      calees: { source: "paroles.txt", methode: "whisper", reconnus: 0.99, lignes: 2, etires: [] },
      refrain: null,
    });
  });

  it("nomme les mots étirés par l'alignement, avec leur ligne ; un numéro hors des paroles est ignoré", () => {
    const dossier = jetable();
    mkdirSync(join(dossier, "paroles"), { recursive: true });
    const lignes = [{ mots: [{ texte: "On", debut: 0, fin: 9 }, { texte: "s'est", debut: 9, fin: 9.2 }] }, { mots: [{ texte: "Après", debut: 10, fin: 10.3 }] }];
    writeFileSync(join(dossier, CHEMINS_DES_PAROLES.calees), JSON.stringify({ source: "paroles.txt", reconnus: 0.8, methode: "alignement", motsEtires: [{ ligne: 0, mot: 0 }, { ligne: 7, mot: 0 }, { ligne: 1, mot: 4 }], lignes }));
    const calees = etatDesParoles(dossier, CHEMINS_DES_PAROLES.calees).calees;
    expect(calees?.methode).toBe("alignement");
    expect(calees?.etires).toEqual([{ mot: "On", ligne: "On s'est" }]);
  });

  it("enregistre le texte de l'artiste, et refuse ce qui ne peut pas être des paroles", () => {
    const dossier = jetable();
    expect(enregistrerLesParoles(dossier, "Ma ligne\n")).toEqual({ ok: true });
    expect(etatDesParoles(dossier, CHEMINS_DES_PAROLES.calees).texte).toBe("Ma ligne\n");
    expect(enregistrerLesParoles(dossier, "x".repeat(LONGUEUR_MAX_DES_PAROLES + 1))).toMatchObject({ ok: false });
  });
});
