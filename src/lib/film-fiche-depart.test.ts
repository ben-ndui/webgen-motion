import { describe, expect, it } from "vitest";

import { erreursDeLaFiche } from "./film-loader";
import { ficheDeDepart, idDepuisNom, problemesDuChoix, textesEncoreExemple } from "./film-fiche-depart";

const CHOIX = { nom: "Maison Saya", langues: ["fr" as const], formats: ["court" as const], direction: "nocturne" as const };

describe("fiche d'un nouveau film", () => {
  it("naît valide, marquée exemple, avec une déclinaison par langue et format", () => {
    const fiche = ficheDeDepart({ ...CHOIX, langues: ["fr", "en"], formats: ["long", "court"] });
    expect(erreursDeLaFiche(fiche)).toEqual([]);
    expect(fiche.exemple).toBe(true);
    expect(fiche.direction).toBe("nocturne");
    expect(fiche.declinaisons.map((d) => d.nom)).toEqual(["Film-FR", "Film-EN", "Court-FR", "Court-EN"]);
    expect(fiche.marque.logo).toMatchObject({ type: "motSymbole", texte: "Maison Saya" });
    expect(fiche.textes.fr.dossierDesEcrans).toBe("ecrans-fr");
  });

  it("ne touche pas au modèle partagé d'une création à l'autre", () => {
    ficheDeDepart(CHOIX).textes.fr.bascule.constat = "modifié";
    expect(ficheDeDepart(CHOIX).textes.fr.bascule.constat).not.toBe("modifié");
  });

  it("liste les textes à écrire dans les seules langues rendues, puis plus aucun une fois écrits", () => {
    const fiche = ficheDeDepart(CHOIX);
    const restants = textesEncoreExemple(fiche);
    expect(restants.length).toBeGreaterThan(10);
    expect(restants.map((r) => r.champ)).toContain("probleme.messages.0");
    expect(restants.every((r) => r.langue === "fr")).toBe(true);
    for (const { champ } of restants) {
      const chemin = champ.split(".");
      const parent = chemin.slice(0, -1).reduce<Record<string, unknown>>((o, k) => o[k] as Record<string, unknown>, fiche.textes.fr as unknown as Record<string, unknown>);
      if (champ.startsWith("bibliotheque.adresse")) fiche.bibliotheque!.adresse = "maisonsayasignature.com";
      else if (champ.startsWith("bibliotheque.legendesEventail.")) fiche.textes.fr.bibliotheque!.legendesEventail[Number(chemin[2])] = `écrit ${champ}`;
      else if (champ.startsWith("probleme.messages.")) fiche.textes.fr.probleme.messages[Number(chemin[2])]!.texte = `écrit ${champ}`;
      else parent[chemin.at(-1)!] = `écrit ${champ}`;
    }
    expect(textesEncoreExemple(fiche)).toEqual([]);
  });

  it("transforme un nom en id sûr, et dit ce qui manque dans le choix", () => {
    expect(idDepuisNom("Maison Saya Signature !")).toBe("maison-saya-signature");
    expect(idDepuisNom("Éclair & Thé")).toBe("eclair-the");
    expect(problemesDuChoix({ nom: "  ", langues: [], formats: [], direction: undefined })).toEqual([
      "Donne un nom à ton film",
      "Choisis au moins une langue",
      "Choisis au moins un format",
      "Choisis un style",
    ]);
    expect(problemesDuChoix({ nom: "!!!", ...{ langues: ["fr"], formats: ["long"], direction: "marque" } })).toContain(
      "Le nom doit contenir au moins une lettre ou un chiffre",
    );
    expect(problemesDuChoix(CHOIX)).toEqual([]);
  });
});
