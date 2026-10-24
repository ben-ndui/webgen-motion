import { describe, expect, it } from "vitest";

import { couperProprement } from "./troncature";

describe("couperProprement", () => {
  it("ne touche pas à un texte qui tient déjà dans la limite", () => {
    expect(couperProprement("court", 50)).toEqual({ texte: "court", tronque: false, longueurOriginale: 5 });
  });

  it("coupe à la dernière fin de paragraphe avant la limite", () => {
    const texte = "Premier paragraphe bien rempli.\n\nSecond paragraphe qui dépasse la limite fixée ici.";
    const resultat = couperProprement(texte, 40);
    expect(resultat.tronque).toBe(true);
    expect(resultat.texte).toBe("Premier paragraphe bien rempli.");
    expect(resultat.longueurOriginale).toBe(texte.length);
  });

  it("à défaut de paragraphe, coupe à la dernière fin de ligne", () => {
    const texte = "Ligne un ici\nLigne deux qui dépasse large la limite fixée pour ce test";
    const resultat = couperProprement(texte, 20);
    expect(resultat.tronque).toBe(true);
    expect(resultat.texte).toBe("Ligne un ici");
  });

  it("à défaut des deux, coupe en plein texte plutôt que de ne rien renvoyer", () => {
    const resultat = couperProprement("un seul mot beaucoup trop long pour la limite donnée", 10);
    expect(resultat.tronque).toBe(true);
    expect(resultat.texte).toHaveLength(10);
  });

  it("ignore un repère trop loin dans la première moitié du texte", () => {
    // Le seul "\n\n" est tout au début : le couper là perdrait presque tout le texte.
    const texte = "Début.\n\n" + "x".repeat(100);
    const resultat = couperProprement(texte, 50);
    expect(resultat.texte).not.toBe("Début.");
    expect(resultat.texte).toHaveLength(50);
  });
});
