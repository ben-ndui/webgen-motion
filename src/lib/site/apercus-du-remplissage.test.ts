import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { cheminDUnApercu, poserUnApercu, viderLesApercus } from "./apercus-du-remplissage";

describe("aperçus du remplissage", () => {
  // os.homedir() lit HOME : les aperçus vont dans un dossier jetable, jamais dans le vrai.
  const avant = process.env.HOME;
  beforeAll(() => {
    process.env.HOME = mkdtempSync(join(tmpdir(), "apercus-"));
  });
  afterAll(() => {
    process.env.HOME = avant;
  });

  it("pose un aperçu, le retrouve, puis l'oublie au remplissage suivant", () => {
    poserUnApercu("mon-film", 1, new Uint8Array([137, 80, 78, 71]));
    const chemin = cheminDUnApercu("mon-film", "1");
    expect(chemin).toMatch(/remplissage\/apercu-1\.png$/);
    viderLesApercus("mon-film");
    expect(cheminDUnApercu("mon-film", "1")).toBeNull();
  });

  it("ne lit rien d'autre : id ou numéro douteux", () => {
    poserUnApercu("mon-film", 2, new Uint8Array([1]));
    expect(cheminDUnApercu("../mon-film", "2")).toBeNull();
    expect(cheminDUnApercu("mon-film", "../2")).toBeNull();
    expect(cheminDUnApercu("mon-film", "2.5")).toBeNull();
    expect(cheminDUnApercu("mon-film", "0")).toBeNull();
    expect(cheminDUnApercu("mon-film", "41")).toBeNull();
    expect(cheminDUnApercu("mon-film", null)).toBeNull();
  });
});
