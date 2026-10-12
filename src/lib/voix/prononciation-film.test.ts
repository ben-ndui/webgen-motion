import { describe, expect, it } from "vitest";

import { texteAPrononcer } from "./prononciation-film";

describe("ce que la voix dit", () => {
  it("dit « slash » dans une adresse, et ne prononce pas le https://", () => {
    expect(texteAPrononcer("maisonsayasignature.com/fr")).toBe("maisonsayasignature.com slash fr");
    expect(texteAPrononcer("https://saya.com/boutique/parfums")).toBe("saya.com slash boutique slash parfums");
  });

  it("garde « 24/7 » (la voix dit « sur ») et ne laisse pas de « slash » final", () => {
    expect(texteAPrononcer("Ouvert 24/7")).toBe("Ouvert 24/7");
    expect(texteAPrononcer("saya.com/")).toBe("saya.com");
  });

  it("ne touche pas un texte sans barre", () => {
    expect(texteAPrononcer("L'hibiscus en signature.")).toBe("L'hibiscus en signature.");
  });
});
