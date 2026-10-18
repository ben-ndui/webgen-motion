import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { type ModeleWhisper, modelePresent, telechargerUnModele } from "./modeles-whisper";

const CONTENU = new TextEncoder().encode("un modèle whisper miniature");
const MODELE: ModeleWhisper = {
  nom: "small",
  fichier: "ggml-essai.bin",
  octets: CONTENU.byteLength,
  sha256: createHash("sha256").update(CONTENU).digest("hex"),
  libelle: "essai",
};
const servir = (octets: Uint8Array, statut = 200) => async () => new Response(octets as unknown as BodyInit, { status: statut });

describe("télécharger un modèle whisper", () => {
  it("écrit le modèle seulement si sa taille et son empreinte sont celles attendues", async () => {
    const dossier = mkdtempSync(join(tmpdir(), "modeles-"));
    const etapes: number[] = [];
    const resultat = await telechargerUnModele(MODELE, (recus) => etapes.push(recus), { dossier, recuperer: servir(CONTENU) });
    expect(resultat).toEqual({ ok: true, chemin: join(dossier, "ggml-essai.bin") });
    expect(etapes.at(-1)).toBe(CONTENU.byteLength);
    expect(readdirSync(dossier)).toEqual(["ggml-essai.bin"]);
  });

  it("refuse un fichier abîmé et ne laisse rien derrière lui (ni modèle, ni .part)", async () => {
    const dossier = mkdtempSync(join(tmpdir(), "modeles-"));
    const abime = CONTENU.slice();
    abime[0] = 0;
    const resultat = await telechargerUnModele(MODELE, () => {}, { dossier, recuperer: servir(abime) });
    expect(resultat).toMatchObject({ ok: false });
    expect(readdirSync(dossier)).toEqual([]);
  });

  it("refuse un fichier coupé, et dit une réponse d'erreur du serveur", async () => {
    const dossier = mkdtempSync(join(tmpdir(), "modeles-"));
    expect(await telechargerUnModele(MODELE, () => {}, { dossier, recuperer: servir(CONTENU.slice(0, 5)) })).toMatchObject({ ok: false });
    expect(await telechargerUnModele(MODELE, () => {}, { dossier, recuperer: servir(new Uint8Array(), 404) })).toEqual({ ok: false, raison: "Le dépôt des modèles a répondu 404." });
    expect(existsSync(join(dossier, "ggml-essai.bin"))).toBe(false);
  });

  it("dit une coupure réseau en clair", async () => {
    const dossier = mkdtempSync(join(tmpdir(), "modeles-"));
    const coupe = async () => { throw new TypeError("fetch failed"); };
    expect(await telechargerUnModele(MODELE, () => {}, { dossier, recuperer: coupe as typeof fetch })).toEqual({ ok: false, raison: "Téléchargement impossible : vérifie ta connexion." });
  });
});

describe("télécharger le modèle d'alignement du karaoké", () => {
  it("va chercher le fichier à SON adresse, et le vérifie de la même façon", async () => {
    const dossier = mkdtempSync(join(tmpdir(), "modeles-"));
    const recuperer = vi.fn(servir(CONTENU));
    const modele = { fichier: "alignement-essai.onnx", octets: CONTENU.byteLength, sha256: MODELE.sha256, adresse: "https://exemple.test/alignement.onnx" };
    expect(await telechargerUnModele(modele, () => {}, { dossier, recuperer: recuperer as unknown as typeof fetch })).toEqual({ ok: true, chemin: join(dossier, "alignement-essai.onnx") });
    expect(recuperer).toHaveBeenCalledWith("https://exemple.test/alignement.onnx");
  });
});

describe("un téléchargement qui ne peut pas s'écrire", () => {
  it("finit en refus clair, sans rester bloqué ni laisser de .part", async () => {
    const parent = mkdtempSync(join(tmpdir(), "modeles-"));
    const dossier = join(parent, "verrouille");
    mkdirSync(dossier);
    chmodSync(dossier, 0o500);
    try {
      const resultat = await telechargerUnModele(MODELE, () => {}, { dossier, recuperer: servir(CONTENU) });
      expect(resultat).toEqual({ ok: false, raison: "Téléchargement interrompu : relance-le." });
      expect(readdirSync(dossier)).toEqual([]);
    } finally {
      chmodSync(dossier, 0o700);
    }
  });
});

describe("un modèle présent est un modèle ENTIER", () => {
  it("un fichier tronqué ou d'une autre taille n'est pas « présent »", () => {
    const dossier = mkdtempSync(join(tmpdir(), "modeles-"));
    writeFileSync(join(dossier, MODELE.fichier), "x");
    expect(modelePresent(MODELE, dossier)).toBe(false);
    writeFileSync(join(dossier, MODELE.fichier), CONTENU);
    expect(modelePresent(MODELE, dossier)).toBe(true);
  });
});
