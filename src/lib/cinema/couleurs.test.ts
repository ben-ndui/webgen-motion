import { describe, expect, it } from "vitest";

import { nomDeCouleur, paletteEnMots } from "./couleurs";

describe("nomDeCouleur", () => {
  it("nomme la charte SAYA comme dans les démos qui ont marché", () => {
    expect(nomDeCouleur("#0A1A2C")).toBe("midnight navy blue");
    expect(nomDeCouleur("#C19A42")).toBe("gold");
    expect(nomDeCouleur("#ECE4D2")).toBe("ivory");
    expect(nomDeCouleur("#9E2B3B")).toBe("crimson red");
  });

  it("nomme les couleurs de Smooth & Design et de webgen-ai", () => {
    expect(nomDeCouleur("#010D23")).toBe("midnight navy blue");
    expect(nomDeCouleur("#2F6BFF")).toBe("royal blue");
    expect(nomDeCouleur("#C8553D")).toBe("terracotta");
    expect(nomDeCouleur("#3A0CA3")).toBe("deep purple");
  });

  it("accepte les minuscules", () => {
    expect(nomDeCouleur("#c19a42")).toBe("gold");
  });
});

describe("paletteEnMots", () => {
  it("lie les teintes en anglais, sans doublon", () => {
    expect(paletteEnMots(["#0A1A2C", "#ECE4D2", "#C19A42"])).toBe("midnight navy blue, ivory and gold");
    expect(paletteEnMots(["#0A1A2C", "#010D23"])).toBe("midnight navy blue");
    expect(paletteEnMots(["#C19A42", "#0A1A2C"])).toBe("gold and midnight navy blue");
  });
});
