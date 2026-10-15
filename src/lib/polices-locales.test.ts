import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { dossierJetable } from "./film-fixtures.test-utils";
import { type InfoDePolice, garderLaPolice } from "./polices-locales";

// Une police « variable » comme Jost : le même fichier sert toutes les graisses.
const JOST: InfoDePolice = {
  fichiers: {
    "400": { latin: "https://fonts.gstatic.com/s/jost/v20/variable-latin.woff2", "latin-ext": "https://fonts.gstatic.com/s/jost/v20/variable-ext.woff2" },
    "600": { latin: "https://fonts.gstatic.com/s/jost/v20/variable-latin.woff2", "latin-ext": "https://fonts.gstatic.com/s/jost/v20/variable-ext.woff2" },
  },
  plages: { latin: "U+0000-00FF", "latin-ext": "U+0100-024F" },
  jeux: ["latin", "latin-ext", "cyrillic"],
};

function lieux() {
  return { cache: dossierJetable("polices-cache"), publicDuFilm: dossierJetable("polices-film") };
}

describe("garderLaPolice", () => {
  it("télécharge chaque fichier UNE fois, le pose dans le film avec son manifeste", async () => {
    const { cache, publicDuFilm } = lieux();
    const telecharger = vi.fn(async (adresse: string) => new TextEncoder().encode(adresse));
    const gardee = await garderLaPolice("Jost", publicDuFilm, { cache, info: async () => JOST, telecharger });
    // 2 graisses × 2 jeux = 4 faces, mais seulement 2 fichiers (variable).
    expect(gardee).toEqual({ ok: true, telecharges: 2 });
    expect(telecharger).toHaveBeenCalledTimes(2);
    const manifeste = JSON.parse(readFileSync(join(publicDuFilm, "polices/jost/police.json"), "utf-8"));
    expect(manifeste.famille).toBe("Jost");
    expect(manifeste.faces).toHaveLength(4);
    expect(manifeste.faces[0]).toEqual({ graisse: "400", jeu: "latin", fichier: "polices/jost/variable-latin.woff2", plage: "U+0000-00FF" });
    expect(existsSync(join(publicDuFilm, "polices/jost/variable-ext.woff2"))).toBe(true);
  });

  it("hors ligne, une police déjà gardée suffit : aucun téléchargement, le rendu peut partir", async () => {
    const { cache, publicDuFilm } = lieux();
    await garderLaPolice("Jost", dossierJetable("autre-film"), { cache, info: async () => JOST, telecharger: async (a) => new TextEncoder().encode(a) });
    const horsLigne = vi.fn(async () => {
      throw new TypeError("net::ERR_INTERNET_DISCONNECTED");
    });
    expect(await garderLaPolice("Jost", publicDuFilm, { cache, info: async () => JOST, telecharger: horsLigne })).toEqual({ ok: true, telecharges: 0 });
    expect(horsLigne).not.toHaveBeenCalled();
    expect(existsSync(join(publicDuFilm, "polices/jost/police.json"))).toBe(true);
  });

  it("hors ligne et jamais téléchargée : refus clair qui dit quoi faire", async () => {
    const { cache, publicDuFilm } = lieux();
    const gardee = await garderLaPolice("Jost", publicDuFilm, {
      cache,
      info: async () => JOST,
      telecharger: async () => {
        throw new TypeError("net::ERR_INTERNET_DISCONNECTED");
      },
    });
    expect(gardee).toMatchObject({ ok: false, horsLigne: true });
    if (!gardee.ok) expect(gardee.raison).toContain("connecte-toi une fois");
  });

  it("une police absente du catalogue n'est pas une panne de réseau", async () => {
    const { cache, publicDuFilm } = lieux();
    expect(await garderLaPolice("Inventée", publicDuFilm, { cache, info: async () => null })).toMatchObject({ ok: false, horsLigne: false });
  });
});
