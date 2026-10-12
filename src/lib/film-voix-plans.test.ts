import { describe, expect, it } from "vitest";

import type { ResolvedVoiceBackend } from "./config";
import { ficheDeDepart } from "./film-fiche-depart";
import { ligneTropLongue, lignesDeDepart, moteurPourLeFilm, phraseDeDepart, reperesMontes, tempsDeParole } from "./film-voix-plans";

const FICHE = ficheDeDepart({ nom: "Saya", langues: ["fr"], formats: ["court"], direction: "nocturne" });
const A_120 = { ...FICHE, musique: { ...FICHE.musique, tempo: 120 } };

describe("voix off : une réplique par repère", () => {
  it("chaque étape du parcours a son propre moment, et se tait jusqu'à la suivante", () => {
    const temps = tempsDeParole(A_120);
    // À 120 BPM, un temps dure 0,5 s ; une étape dure 6 temps.
    expect(temps["parcours.0"]).toBeCloseTo(3, 1);
    expect(temps["parcours.1"]).toBeCloseTo(3, 1);
    // La bascule : constat à 0, chiffre à 1,5 temps, promesse à 5 : 0,75 s pour le constat.
    expect(temps["bascule.constat"]).toBeCloseTo(0.75, 1);
    expect(temps["bascule.chiffre"]).toBeCloseTo(1.75, 1);
  });

  it("le format vertical n'a pas de plan « marque » : aucun repère, aucune réplique", () => {
    expect(reperesMontes(FICHE, "fr").some((r) => r.plan === "marque")).toBe(false);
    expect(tempsDeParole(FICHE)["marque.mots.0"]).toBeUndefined();
  });

  it("propose de dire ce que l'image affiche, réplique par réplique", () => {
    const fiche = structuredClone(FICHE);
    fiche.textes.fr.parcours = ["Choisir", "Sentir", "Commander", "Recevoir"];
    const lignes = lignesDeDepart(fiche, "fr");
    expect(lignes.filter((l) => l.repere.startsWith("parcours.")).map((l) => l.texte)).toEqual(["Choisir", "Sentir", "Commander", "Recevoir"]);
    // Tout ce que l'image montre est dit : le nom, la conversation, chaque étape.
    expect(lignes[0]).toEqual({ repere: "ouverture.nom", texte: "Saya" });
    expect(lignes.some((l) => l.repere.startsWith("probleme.messages."))).toBe(true);
    expect(lignes.every((l) => !l.fichier)).toBe(true);
  });

  it("dit le nom de la marque même quand le logo est une image", () => {
    const fiche = structuredClone(FICHE);
    fiche.marque.logo = { type: "image", fichier: "logo/saya.png", rapport: 2, inverser: false };
    expect(phraseDeDepart(fiche, "fr", "ouverture.nom")).toBe("Saya");
  });

  it("a une phrase de départ pour chaque repère, y compris l'ouverture", () => {
    expect(phraseDeDepart(FICHE, "fr", "ouverture.nom")).toBe("Saya");
    expect(phraseDeDepart(FICHE, "fr", "probleme.messages.0")).toBe(FICHE.textes.fr.probleme.messages[0]!.texte);
  });

  it("signale une réplique plus longue que son temps", () => {
    expect(ligneTropLongue({ repere: "parcours.0", texte: "x", duree: 3.4 }, { "parcours.0": 3 })).toBe(true);
    expect(ligneTropLongue({ repere: "parcours.0", texte: "x", duree: 2.5 }, { "parcours.0": 3 })).toBe(false);
  });

  it("la voix parle la langue du film, au débit du style", () => {
    const google: ResolvedVoiceBackend = { kind: "google", voice: "fr-FR-Neural2-D", languageCode: "fr-FR", speakingRate: 1, pronunciation: {}, credentialsPath: "x" };
    expect(moteurPourLeFilm(google, "fr", "nocturne")).toMatchObject({ voice: "fr-FR-Neural2-D", speakingRate: 0.9 });
    expect(moteurPourLeFilm(google, "en", "editorial")).toMatchObject({ voice: "en-US-Neural2-J", languageCode: "en-US", speakingRate: 1.08 });
  });
});
