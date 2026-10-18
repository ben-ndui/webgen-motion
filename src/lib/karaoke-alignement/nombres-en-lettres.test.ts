import { describe, expect, it } from "vitest";

import { nombreEnLettres } from "./nombres-en-lettres";

describe("un nombre tel qu'on le chante", () => {
  it.each([
    ["0", "zero"], ["1", "un"], ["10", "dix"], ["16", "seize"], ["17", "dix-sept"],
    ["21", "vingt et un"], ["22", "vingt-deux"], ["71", "soixante et onze"], ["77", "soixante-dix-sept"],
    ["80", "quatre-vingts"], ["81", "quatre-vingt-un"], ["91", "quatre-vingt-onze"], ["99", "quatre-vingt-dix-neuf"],
    ["100", "cent"], ["200", "deux cents"], ["101", "cent un"], ["999", "neuf cent quatre-vingt-dix-neuf"],
    ["1000", "mille"], ["2026", "deux mille vingt-six"], ["24000", "vingt-quatre mille"],
  ])("%s → %s", (chiffres, lettres) => {
    expect(nombreEnLettres(chiffres)).toBe(lettres);
  });

  it("rien au-delà de 999 999, ni pour ce qui n'est pas un nombre", () => {
    expect(nombreEnLettres("1000000")).toBeNull();
    expect(nombreEnLettres("")).toBeNull();
    expect(nombreEnLettres("1,5")).toBeNull();
  });
});
