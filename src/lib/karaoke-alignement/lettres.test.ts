import { describe, expect, it } from "vitest";

import { lettresDuMot } from "./lettres";
import { ALPHABET_FRANCAIS } from "./modele-francais";

const lire = (mot: string) => lettresDuMot(mot, ALPHABET_FRANCAIS).map((n) => Object.keys(ALPHABET_FRANCAIS).find((k) => ALPHABET_FRANCAIS[k] === n)).join("");

describe("les lettres qu'un modèle sait lire", () => {
  it("garde les accents et l'apostrophe, retire la casse et la ponctuation", () => {
    expect(lire("L'époque,")).toBe("l'époque");
    expect(lire("Été !")).toBe("été");
  });

  it("l'apostrophe typographique est lue comme la droite", () => {
    expect(lire("s’est")).toBe("s'est");
  });

  it("un nombre se lit comme il se chante, pas chiffre par chiffre", () => {
    expect(lire("9")).toBe("neuf");
    expect(lire("10")).toBe("dix");
    expect(lire("24")).toBe("vingt-quatre");
    expect(lire("2026,")).toBe("deuxmillevingt-six");
  });

  it("une lettre inconnue avec son accent est lue sans", () => {
    expect(lire("ÿ")).toBe("y");
  });

  it("un mot sans lettre lisible ne donne rien", () => {
    expect(lire("…")).toBe("");
    expect(lire("!")).toBe("");
  });
});
