import { describe, expect, it } from "vitest";

import { jeuxDeCaracteres } from "./police";

describe("jeux de caractères d'une police", () => {
  it("Italiana (latin seul, une graisse) : on ne demande pas le latin étendu", () => {
    expect(jeuxDeCaracteres({ "400": { latin: "x.woff2" } }, ["400"], ["latin"])).toEqual(["latin"]);
  });

  it("une police complète garde le latin étendu", () => {
    const fichiers = { "400": { latin: "a", "latin-ext": "b" }, "600": { latin: "c", "latin-ext": "d" } };
    expect(jeuxDeCaracteres(fichiers, ["400", "600"], ["latin", "latin-ext", "cyrillic"])).toEqual(["latin", "latin-ext"]);
  });

  it("le latin étendu manque pour UNE graisse : on ne le demande pour aucune", () => {
    const fichiers = { "400": { latin: "a", "latin-ext": "b" }, "800": { latin: "c" } };
    expect(jeuxDeCaracteres(fichiers, ["400", "800"], ["latin", "latin-ext"])).toEqual(["latin"]);
  });

  it("une police sans latin garde son propre jeu", () => {
    expect(jeuxDeCaracteres({ "400": { cyrillic: "a" } }, ["400"], ["cyrillic"])).toEqual(["cyrillic"]);
  });
});
