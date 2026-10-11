import { describe, expect, it } from "vitest";

import { RAMPE, facteurDeSourdine } from "./sourdine";

describe("musique sous la voix", () => {
  const voix = [{ debut: 100, fin: 160 }];

  it("pleine hors des voix, au niveau choisi pendant", () => {
    expect(facteurDeSourdine(10, voix, 0.3)).toBe(1);
    expect(facteurDeSourdine(130, voix, 0.3)).toBe(0.3);
    expect(facteurDeSourdine(400, voix, 0.3)).toBe(1);
  });

  it("descend et remonte en rampe, sans saut", () => {
    expect(facteurDeSourdine(100 - RAMPE / 2, voix, 0.2)).toBeCloseTo(0.6, 5);
    expect(facteurDeSourdine(160 + RAMPE / 2, voix, 0.2)).toBeCloseTo(0.6, 5);
  });

  it("sans voix, la musique ne bouge pas", () => {
    expect(facteurDeSourdine(50, [], 0.2)).toBe(1);
  });
});
