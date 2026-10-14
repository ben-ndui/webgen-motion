import { describe, expect, it } from "vitest";

import { motsDe, partEntendue, repliqueDite } from "./comparer-replique";

const DEMANDEE = "Ce parfum, c'est l'histoire de ma grand-mère.";

describe("comparer une réplique", () => {
  it("la transcription réelle du 14/10 est jugée dite", () => {
    expect(repliqueDite(DEMANDEE, " Ce parfum, c'est l'histoire de ma grand-mère.")).toBe(true);
  });

  it("ignore majuscules, accents, ponctuation et apostrophe typographique", () => {
    expect(motsDe("C’est l'Histoire — de MA grand-mère !")).toEqual(["c", "est", "l", "histoire", "de", "ma", "grand", "mere"]);
    expect(repliqueDite(DEMANDEE, "ce parfum c est l histoire de ma grand mere")).toBe(true);
  });

  it("tolère un petit mot raté, pas une phrase différente", () => {
    expect(repliqueDite(DEMANDEE, "Ce parfum, c'est histoire de ma grand-mère.")).toBe(true);
    expect(repliqueDite(DEMANDEE, "Ce parfum me rappelle mon enfance.")).toBe(false);
  });

  it("rien d'entendu (plan muet) n'est pas une réplique dite", () => {
    expect(partEntendue(DEMANDEE, "")).toBe(0);
    expect(repliqueDite(DEMANDEE, "")).toBe(false);
  });

  it("un mot répété dans la demande doit être entendu autant de fois", () => {
    expect(partEntendue("non non non", "non")).toBeCloseTo(1 / 3);
  });
});
