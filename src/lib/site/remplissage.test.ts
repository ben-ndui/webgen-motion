import { describe, expect, it } from "vitest";

import { erreursDeLaFiche } from "../film-loader";
import { ficheDeDepart, textesEncoreExemple } from "../film-fiche-depart";
import { remplirLaFiche } from "./remplissage";

const FICHE = ficheDeDepart({ nom: "Saya", langues: ["fr"], formats: ["court"], direction: "nocturne" });
const LU = {
  marque: { encre: "#0A1A2C", clair: "#ECE4D2", accent: "#C19A42", police: "Italiana", sources: [] },
  adresse: "saya.com",
  histoires: {
    fr: {
      conversation: [{ auteur: "moi" as const, texte: "Un parfum naturel ?" }, { auteur: "autre" as const, texte: "Introuvable." }],
      constat: "Les parfums naturels sont rares.",
      promesse: "La parfumerie, naturellement.",
      parcours: ["Choisir", "Sentir", "Commander", "Recevoir"],
      troisMots: ["Naturel.", "Fait main.", "À Nice."],
      motSignature: "Hibiscus.",
    },
  },
};

describe("remplir la fiche depuis le site", () => {
  it("pose la marque et les textes proposés, et les note pour l'affichage", () => {
    const { fiche, propositions } = remplirLaFiche(FICHE, LU);
    expect(erreursDeLaFiche(fiche)).toEqual([]);
    expect(fiche.marque.couleurs).toMatchObject({ encre: "#0A1A2C", clair: "#ECE4D2", accent: "#C19A42" });
    expect(fiche.marque.police).toBe("Italiana");
    expect(fiche.bibliotheque?.adresse).toBe("saya.com");
    expect(fiche.textes.fr.parcours).toEqual(["Choisir", "Sentir", "Commander", "Recevoir"]);
    expect(fiche.textes.fr.probleme.messages[0]?.texte).toBe("Un parfum naturel ?");
    expect(propositions).toMatchObject({ "fr:bascule.constat": "Les parfums naturels sont rares.", "marque.police": "Italiana", "fr:probleme.messages.1": "Introuvable." });
  });

  it("n'écrase jamais ce que la personne a déjà écrit", () => {
    const ecrite = structuredClone(FICHE);
    ecrite.textes.fr.bascule.constat = "Mon constat à moi";
    ecrite.marque.police = "Inter";
    ecrite.textes.fr.probleme.messages[0]!.texte = "Mon message";
    const { fiche, propositions } = remplirLaFiche(ecrite, LU);
    expect(fiche.textes.fr.bascule.constat).toBe("Mon constat à moi");
    expect(fiche.marque.police).toBe("Inter");
    expect(fiche.textes.fr.probleme.messages[0]?.texte).toBe("Mon message");
    expect(propositions["fr:bascule.constat"]).toBeUndefined();
  });

  it("garde en suggestion ce qu'il n'a pas posé, pour l'afficher sous le texte déjà écrit", () => {
    const ecrite = structuredClone(FICHE);
    ecrite.textes.fr.bascule.constat = "Un constat";
    ecrite.textes.fr.probleme.messages[0]!.texte = "Mon message";
    const { suggestions } = remplirLaFiche(ecrite, LU);
    expect(suggestions["fr:bascule.constat"]).toBe("Les parfums naturels sont rares.");
    expect(suggestions["fr:probleme.messages.0"]).toBe("Un parfum naturel ?");
    expect(suggestions["fr:parcours.2"]).toBe("Commander");
  });

  it("ce que Claude n'a pas proposé (le chiffre) reste à écrire", () => {
    const { fiche } = remplirLaFiche(FICHE, LU);
    expect(textesEncoreExemple(fiche).map((t) => t.champ)).toContain("bascule.chiffre");
  });

  it("ne touche pas la fiche reçue", () => {
    const avant = structuredClone(FICHE);
    remplirLaFiche(FICHE, LU);
    expect(FICHE).toEqual(avant);
  });
});
