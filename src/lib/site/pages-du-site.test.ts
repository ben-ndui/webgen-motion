import { describe, expect, it } from "vitest";

import { adresseLisible, choisirLesPages, normaliserLAdresse } from "./pages-du-site";

const lien = (url: string, texte: string, dansLeMenu = true) => ({ url: `https://saya.com${url}`, texte, dansLeMenu });

describe("pages à capturer", () => {
  it("suit le menu, écarte les pages légales et de compte, met la commande en preuve", () => {
    const pages = choisirLesPages([
      lien("/mentions-legales", "Mentions légales", false),
      lien("/parfums", "Parfums"),
      lien("/connexion", "Se connecter"),
      lien("/soins", "Soins"),
      lien("/panier", "Panier"),
      lien("/notre-histoire", "Notre histoire", false),
      lien("/gourmandises", "Gourmandises"),
    ]);
    expect(pages.parcours).toEqual(["https://saya.com/parfums", "https://saya.com/soins", "https://saya.com/gourmandises"]);
    expect(pages.preuve).toBe("https://saya.com/panier");
  });

  it("un site d'une seule page : aucun parcours, aucune preuve", () => {
    expect(choisirLesPages([])).toEqual({ parcours: [], preuve: null });
  });

  it("complète une adresse tapée sans https, refuse le reste", () => {
    expect(normaliserLAdresse("maisonsayasignature.com")).toBe("https://maisonsayasignature.com/");
    expect(normaliserLAdresse("  https://saya.com/fr ")).toBe("https://saya.com/fr");
    expect(normaliserLAdresse("file:///etc/passwd")).toBeNull();
    expect(normaliserLAdresse("javascript:alert(1)")).toBeNull();
    expect(normaliserLAdresse("pasunsite")).toBeNull();
    expect(normaliserLAdresse("")).toBeNull();
  });

  it("donne l'adresse telle qu'on la lit", () => {
    expect(adresseLisible("https://www.maisonsayasignature.com/fr")).toBe("maisonsayasignature.com");
  });
});
