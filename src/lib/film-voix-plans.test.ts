import { describe, expect, it } from "vitest";

import type { ResolvedVoiceBackend } from "./config";
import { ficheDeDepart } from "./film-fiche-depart";
import { ligneTropLongue, lignesDeDepart, moteurPourLaLangue, phraseDeDepart, tempsDeParole } from "./film-voix-plans";

const FICHE = ficheDeDepart({ nom: "Saya", langues: ["fr"], formats: ["court"], direction: "nocturne" });

describe("voix off : plans et phrases", () => {
  it("donne le temps de parole de chaque plan du montage, à partir du tempo", () => {
    const temps = tempsDeParole({ ...FICHE, musique: { ...FICHE.musique, tempo: 120 } });
    // À 120 BPM, une mesure dure 2 s ; la bascule fait 3 mesures, moins un demi-temps (0,25 s, arrondi à l’image).
    expect(temps.bascule).toBeCloseTo(5.75, 1);
    // Le court n'a pas de plan « marque ».
    expect(temps.marque).toBeUndefined();
  });

  it("prend le plus court des montages quand un plan est dans les deux", () => {
    const temps = tempsDeParole({ ...FICHE, declinaisons: [...FICHE.declinaisons, { nom: "Film-FR", langue: "fr", version: "long", avecContact: true }] });
    expect(temps.marque).toBeGreaterThan(0);
  });

  it("propose des phrases tirées des textes à l'écran, sans ligne vide", () => {
    const lignes = lignesDeDepart(FICHE, "fr");
    // Le format vertical n'a pas de plan « marque » : pas de phrase pour lui.
    expect(lignes.map((l) => l.plan)).toEqual(["bascule", "parcours", "evenement", "fin"]);
    const fiche = structuredClone(FICHE);
    fiche.textes.fr.parcours = ["Choisir", "Sentir.", "Commander", "Recevoir"];
    expect(lignesDeDepart(fiche, "fr").find((l) => l.plan === "parcours")?.texte).toBe("Choisir. Sentir. Commander. Recevoir.");
    expect(lignes.every((l) => l.texte.length > 0 && !l.fichier)).toBe(true);
  });

  it("a une phrase de départ pour l'ouverture (le nom) et le problème (le 1er message)", () => {
    expect(phraseDeDepart(FICHE, "fr", "ouverture")).toBe("Saya");
    expect(phraseDeDepart(FICHE, "fr", "probleme")).toBe(FICHE.textes.fr.probleme.messages[0]!.texte);
  });

  it("signale une voix plus longue que son plan", () => {
    const temps = { bascule: 3 };
    expect(ligneTropLongue({ plan: "bascule", texte: "x", duree: 3.4 }, temps)).toBe(true);
    expect(ligneTropLongue({ plan: "bascule", texte: "x", duree: 2.5 }, temps)).toBe(false);
    expect(ligneTropLongue({ plan: "bascule", texte: "x" }, temps)).toBe(false);
  });

  it("fait parler la voix Google dans la langue du film", () => {
    const google: ResolvedVoiceBackend = { kind: "google", voice: "fr-FR-Neural2-D", languageCode: "fr-FR", speakingRate: 1, pronunciation: {}, credentialsPath: "x" };
    expect(moteurPourLaLangue(google, "fr")).toBe(google);
    expect(moteurPourLaLangue(google, "en")).toMatchObject({ voice: "en-US-Neural2-J", languageCode: "en-US" });
  });
});
