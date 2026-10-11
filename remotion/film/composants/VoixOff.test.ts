import { describe, expect, it } from "vitest";

import { FILM } from "../film";
import { imageDuTemps, placerLesPlans } from "../lib/tempo";
import { MONTAGES } from "../montages";
import { reperesDuFilm } from "../reperes";
import { RESPIRATION, voixPlacees } from "./VoixOff";

describe("placement des répliques", () => {
  const tempo = 120;
  const places = placerLesPlans(MONTAGES.court.plans, tempo);
  const reperes = reperesDuFilm(FILM, "fr");

  it("une réplique part au moment exact où son texte apparaît", () => {
    const [voix] = voixPlacees([{ repere: "parcours.2", texte: "x", fichier: "v.mp3", duree: 1 }], reperes, places, tempo, 30);
    const parcours = places.find((p) => p.id === "parcours")!;
    expect(voix!.debut).toBe(parcours.debut + imageDuTemps(2 * 6 + 0.5, tempo));
    expect(voix!.fin - voix!.debut).toBe(30);
  });

  it("une réplique pas générée, ou d'un plan absent du montage, n'est pas jouée", () => {
    const voix = voixPlacees(
      [{ repere: "parcours.0", texte: "pas générée" }, { repere: "marque.mots.0", texte: "x", fichier: "v.mp3", duree: 1 }],
      reperes, places, tempo, 30,
    );
    expect(voix).toEqual([]);
  });

  it("une voix ne se coupe jamais : la suivante attend la fin de la précédente, puis un souffle", () => {
    const [constat, chiffre] = voixPlacees(
      [
        { repere: "bascule.chiffre", texte: "b", fichier: "b.mp3", duree: 0.5 },
        { repere: "bascule.constat", texte: "a", fichier: "a.mp3", duree: 2 },
      ],
      reperes, places, tempo, 30,
    );
    expect(constat!.repere).toBe("bascule.constat");
    expect(chiffre!.debut).toBe(constat!.fin + RESPIRATION);
    expect(chiffre!.fin - chiffre!.debut).toBe(15);
  });
});
