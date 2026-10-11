import { describe, expect, it } from "vitest";

import type { LectureDuSite } from "./lecture-du-site";
import { chiffreDuSite, demandeDeRedaction, lireLaReponse } from "./redaction-proposee";

const LECTURE: LectureDuSite = {
  url: "https://saya.com/",
  titre: "Maison Saya",
  description: "Haute parfumerie naturelle, 100 % fait main à Nice.",
  langue: "fr",
  nomDuSite: "Maison Saya",
  logos: [],
  couleurs: [],
  polices: [],
  liens: [{ url: "https://saya.com/parfums", texte: "Parfums", dansLeMenu: true }],
  textes: { titres: ["L'hibiscus en signature"], paragraphes: ["Plus de 1 200 clientes nous font confiance."], boutons: ["Découvrir"], chiffres: ["100 %", "1 200 clientes"] },
};

const BONNE = {
  conversation: [{ auteur: "moi", texte: "Tu as trouvé un parfum naturel ?" }, { auteur: "autre", texte: "Pas encore…" }],
  constat: "Les parfums naturels sont rares.",
  chiffre: "100 % fait main.",
  promesse: "La haute parfumerie, naturellement.",
  parcours: ["Choisir", "Sentir", "Commander", "Recevoir"],
  momentCle: "Ton parfum, livré chez toi.",
  troisMots: ["Naturel.", "Fait main.", "À Nice."],
  ouTrouver: "saya.com",
  motSignature: "Hibiscus.",
  anneau: "Naturel · Fait main · Nice",
  legendes: ["Les parfums", "Les soins", "Les douceurs", "Le panier"],
  signature: "Maison de haute parfumerie naturelle",
};

describe("rédaction proposée par Claude", () => {
  it("demande les langues voulues et transmet le contenu du site, chiffres compris", () => {
    const { systeme, message } = demandeDeRedaction(LECTURE, ["fr", "en"]);
    expect(systeme).toContain("n'invente RIEN");
    expect(message).toContain('"fr": {…}, "en": {…}');
    expect(message).toContain("1 200 clientes");
  });

  it("donne à Claude les écrans du parcours dans l'ordre du film, accueil compris", () => {
    const { message } = demandeDeRedaction(LECTURE, ["fr"], ["Accueil", "Parfums", "Boutique", "Histoire"]);
    expect(message).toContain("« Accueil », « Parfums », « Boutique », « Histoire »");
  });

  it("garde une réponse conforme", () => {
    const { histoires, rejetes } = lireLaReponse({ fr: BONNE }, ["fr"], LECTURE);
    expect(rejetes).toEqual([]);
    expect(histoires.fr).toMatchObject({ chiffre: "100 % fait main.", parcours: BONNE.parcours });
  });

  it("refuse un chiffre que le site ne contient pas, et un texte trop long, sans les couper", () => {
    const reponse = { fr: { ...BONNE, chiffre: "98 % de clientes ravies", promesse: "x".repeat(200) } };
    const { histoires, rejetes } = lireLaReponse(reponse, ["fr"], LECTURE);
    expect(histoires.fr?.chiffre).toBeUndefined();
    expect(histoires.fr?.promesse).toBeUndefined();
    expect(rejetes).toEqual(expect.arrayContaining(["fr.chiffre", "fr.promesse"]));
  });

  it("refuse une conversation qui répète un message, et un prix en guise de chiffre", () => {
    const conversation = [{ auteur: "moi", texte: "Un parfum naturel ?" }, { auteur: "autre", texte: "Non." }, { auteur: "moi", texte: "Un parfum naturel ?" }];
    const lecturePrix = { ...LECTURE, textes: { ...LECTURE.textes, chiffres: [...LECTURE.textes.chiffres, "19,90 €"] } };
    const { histoires } = lireLaReponse({ fr: { ...BONNE, conversation, chiffre: "19,90 €" } }, ["fr"], lecturePrix);
    expect(histoires.fr?.conversation).toBeUndefined();
    expect(histoires.fr?.chiffre).toBeUndefined();
  });

  it("dans une liste, un texte refusé n'emporte pas les autres", () => {
    const legendes = ["Les parfums", "x".repeat(60), "Les douceurs"];
    const { histoires } = lireLaReponse({ fr: { ...BONNE, legendes } }, ["fr"], LECTURE);
    expect(histoires.fr?.legendes).toEqual(["Les parfums", undefined, "Les douceurs", undefined]);
  });

  it("une réponse vide ou d'une autre forme ne propose rien", () => {
    const { histoires, rejetes } = lireLaReponse("du texte", ["fr"], LECTURE);
    expect(histoires.fr).toEqual({});
    expect(rejetes).toHaveLength(12);
  });

  it("reconnaît un nombre du site même écrit avec une espace des milliers", () => {
    expect(chiffreDuSite("1200 clientes", LECTURE)).toBe(true);
    expect(chiffreDuSite("1 200 clientes", LECTURE)).toBe(true);
    expect(chiffreDuSite("Des clientes fidèles", LECTURE)).toBe(false);
  });
});
