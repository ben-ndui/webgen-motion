import { describe, expect, it } from "vitest";

import { ficheDeDepart } from "@/lib/film-fiche-depart";
import { poserUneSuggestion, suggestionsEnAttente } from "./suggestions-du-site";

const FICHE = ficheDeDepart({ nom: "Saya", langues: ["fr"], formats: ["court"], direction: "nocturne" });

describe("suggestions du site", () => {
  it("pose chaque sorte de texte à sa place", () => {
    const f = structuredClone(FICHE);
    poserUneSuggestion(f, "fr", "bascule.constat", "A");
    poserUneSuggestion(f, "fr", "parcours.2", "B");
    poserUneSuggestion(f, "fr", "marque.mots.1", "C");
    poserUneSuggestion(f, "fr", "probleme.messages.0", "D");
    poserUneSuggestion(f, "fr", "bibliotheque.legendesEventail.3", "E");
    poserUneSuggestion(f, "fr", "evenement.chute", "F");
    expect([f.textes.fr.bascule.constat, f.textes.fr.parcours[2], f.textes.fr.marque.mots[1], f.textes.fr.probleme.messages[0]?.texte, f.textes.fr.bibliotheque?.legendesEventail[3], f.textes.fr.evenement.chute]).toEqual(["A", "B", "C", "D", "E", "F"]);
  });

  it("une clé inconnue ou hors de la liste ne touche à rien", () => {
    const f = structuredClone(FICHE);
    poserUneSuggestion(f, "fr", "parcours.9", "X");
    poserUneSuggestion(f, "fr", "probleme.messages.7", "X");
    poserUneSuggestion(f, "fr", "inconnu", "X");
    expect(f).toEqual(FICHE);
  });

  it("ne compte que les suggestions de la langue qui changeraient encore quelque chose", () => {
    const f = structuredClone(FICHE);
    f.textes.fr.bascule.constat = "Déjà pareil";
    const attente = suggestionsEnAttente(f, "fr", { "fr:bascule.constat": "Déjà pareil", "fr:parcours.0": "Choisir", "en:parcours.0": "Pick", "bibliotheque.adresse": "saya.com" });
    expect(attente).toEqual([["parcours.0", "Choisir"]]);
  });
});
