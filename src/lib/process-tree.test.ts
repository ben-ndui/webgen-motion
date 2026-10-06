import { describe, expect, it } from "vitest";

import { descendantsDans, lireTableDesProcess } from "./process-tree";

// npx (10) → tsx (11) → runner (12) → remotion (13) → chrome (14) → gpu (15)
const PS = `
    1     0
   10     1
   11    10
   12    11
   13    12
   14    13
   15    14
   99     1
  ligne illisible
`;

describe("process-tree", () => {
  it("retrouve toute la descendance, navigateur compris", () => {
    const table = lireTableDesProcess(PS);
    expect(descendantsDans(table, 10).sort((a, b) => a - b)).toEqual([11, 12, 13, 14, 15]);
  });

  it("ne remonte ni la racine ni les process voisins", () => {
    const table = lireTableDesProcess(PS);
    expect(descendantsDans(table, 13).sort((a, b) => a - b)).toEqual([14, 15]);
    expect(descendantsDans(table, 99)).toEqual([]);
  });
});
