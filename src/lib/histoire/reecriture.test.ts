import { describe, expect, it } from "vitest";

import { ficheValide } from "../film-fixtures.test-utils";
import type { MemoireDuSite } from "../site/memoire-du-site";
import { demandeDeReecriture, lireLaReecriture } from "./reecriture";

const TEXTES = ficheValide().textes.fr;
const MEMOIRE: MemoireDuSite = {
  url: "https://maisonsaya.fr",
  titre: "Maison Saya",
  description: "Parfums naturels depuis 2014",
  nomDuSite: "Maison Saya",
  textes: { titres: ["Nos parfums"], paragraphes: ["Plus de 1 200 clientes fidèles"], boutons: [], chiffres: ["1 200 clientes"] },
  pages: ["Boutique", "Contact"],
};

describe("demandeDeReecriture", () => {
  it("dit à Claude la section, ses champs, la consigne, ce qu'il ne faut pas reproposer, et les faits du site", () => {
    const { systeme, message } = demandeDeReecriture({ marque: "Maison Saya", langue: "fr", section: "bascule", textes: TEXTES, memoire: MEMOIRE, consigne: "plus chaleureux", aEviter: ["Une phrase déjà refusée"] });
    expect(systeme).toContain("invent NOTHING");
    expect(systeme).toContain("Write in French");
    expect(message).toContain('"bascule.constat"');
    expect(message).toContain('"bascule.chiffre"');
    expect(message).toContain("« plus chaleureux »");
    expect(message).toContain("- Une phrase déjà refusée");
    expect(message).toContain("1 200 clientes");
  });

  it("sans mémoire du site : le dit, et demande null pour tout chiffre", () => {
    const { message } = demandeDeReecriture({ marque: "M", langue: "en", section: "moment", textes: TEXTES, memoire: null, consigne: "", aEviter: [] });
    expect(message).toContain("the site was never read");
    expect(message).not.toContain("What the owner asks");
  });
});

describe("lireLaReecriture", () => {
  const demande = { section: "bascule" as const, textes: TEXTES, memoire: MEMOIRE };

  it("garde ce qui tient dans les longueurs, et dit ce qui reste à écrire soi-même", () => {
    const lu = lireLaReecriture(demande, { champs: { "bascule.constat": "  Chercher un parfum   sans chimie  ", "bascule.chiffre": null, "bascule.signature": "Des parfums qui vous ressemblent." } });
    expect(lu).toEqual({ ok: true, champs: { "bascule.constat": "Chercher un parfum sans chimie", "bascule.signature": "Des parfums qui vous ressemblent." }, aEcrireSoiMeme: ["bascule.chiffre"] });
  });

  it("un chiffre n'est gardé que s'il est écrit sur le site, et jamais un prix", () => {
    const vrai = lireLaReecriture(demande, { champs: { "bascule.chiffre": "1 200 clientes fidèles" } });
    expect(vrai.ok && vrai.champs["bascule.chiffre"]).toBe("1 200 clientes fidèles");
    const invente = lireLaReecriture(demande, { champs: { "bascule.chiffre": "5 000 clientes", "bascule.constat": "x" } });
    expect(invente.ok && invente.champs["bascule.chiffre"]).toBeUndefined();
    const prix = lireLaReecriture(demande, { champs: { "bascule.chiffre": "1 200 € offerts", "bascule.constat": "x" } });
    expect(prix.ok && prix.champs["bascule.chiffre"]).toBeUndefined();
  });

  it("sans mémoire du site, aucun chiffre n'est accepté : rien ne permet de le vérifier", () => {
    const lu = lireLaReecriture({ ...demande, memoire: null }, { champs: { "bascule.chiffre": "1 200 clientes", "bascule.constat": "x" } });
    expect(lu.ok && lu.aEcrireSoiMeme).toContain("bascule.chiffre");
  });

  it("refuse un texte trop long au lieu de le couper", () => {
    const lu = lireLaReecriture({ ...demande, section: "marque" }, { champs: { "marque.mots.0": "Un mot bien trop long pour tenir", "marque.mots.1": "Naturel" } });
    expect(lu.ok && lu.champs).toEqual({ "marque.mots.1": "Naturel" });
  });

  it("refuse deux messages identiques dans la conversation", () => {
    const lu = lireLaReecriture({ ...demande, section: "probleme" }, { champs: { "probleme.messages.0": "Tu as trouvé ?", "probleme.messages.1": "tu as trouvé ?" } });
    expect(lu).toEqual({ ok: false, raison: "Claude a répété un message : relance." });
  });

  it("rien d'utilisable : le dit, plutôt qu'une proposition vide", () => {
    expect(lireLaReecriture(demande, { champs: {} })).toMatchObject({ ok: false });
    expect(lireLaReecriture(demande, "pas du json")).toMatchObject({ ok: false });
  });
});
