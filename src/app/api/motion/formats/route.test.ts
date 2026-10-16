import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resetEditionCache } from "@/lib/edition";
import { GET as LIRE, PUT as ENREGISTRER } from "./[id]/route";
import { POST as RENDRE } from "./render/route";
import { GET as LISTER, POST as CREER } from "./route";

const requete = (corps: unknown) => ({ json: async () => corps }) as unknown as NextRequest;
const contexte = (id: string) => ({ params: Promise.resolve({ id }) });
const ORIGINES = { dossier: process.env.WEBGEN_FORMATS_DIR, edition: process.env.WEBGEN_MOTION_EDITION };

beforeEach(() => {
  process.env.WEBGEN_FORMATS_DIR = mkdtempSync(join(tmpdir(), "formats-route-"));
});
afterEach(() => {
  for (const [cle, valeur] of [["WEBGEN_FORMATS_DIR", ORIGINES.dossier], ["WEBGEN_MOTION_EDITION", ORIGINES.edition]] as const) {
    if (valeur === undefined) delete process.env[cle];
    else process.env[cle] = valeur;
  }
  resetEditionCache();
});

describe("les routes des formats", () => {
  it("créent un projet depuis son nom, puis le listent avec son format", async () => {
    const reponse = await CREER(requete({ format: "karaoke", nom: "Wes Øf. 10 ANS" }));
    expect(reponse.status).toBe(201);
    expect(await reponse.json()).toEqual({ id: "wes-of-10-ans" });
    expect((await CREER(requete({ format: "karaoke", nom: "Wes Øf. 10 ANS" }))).status).toBe(409);
    const liste = await (await LISTER()).json();
    expect(liste.catalogue.map((f: { nom: string }) => f.nom)).toEqual(["explainer", "conte", "karaoke"]);
    expect(liste.projets).toEqual([{ id: "wes-of-10-ans", etat: "valide", format: "karaoke", exemple: true }]);
  });

  it("refusent un format inconnu ou un nom vide, avec la raison", async () => {
    const reponse = await CREER(requete({ format: "typo-3d", nom: "" }));
    expect(reponse.status).toBe(400);
    expect((await reponse.json()).erreurs).toHaveLength(2);
  });

  it("relisent et enregistrent un projet, sans jamais changer son format", async () => {
    await CREER(requete({ format: "conte", nom: "mon conte" }));
    const { projet } = await (await LIRE(requete(null), contexte("mon-conte"))).json();
    expect((await ENREGISTRER(requete({ projet }), contexte("mon-conte"))).status).toBe(200);
    const change = await ENREGISTRER(requete({ projet: { ...projet, format: "explainer" } }), contexte("mon-conte"));
    expect(change.status).toBe(400);
    expect((await LIRE(requete(null), contexte("../../etc"))).status).toBe(404);
  });

  it("gardent le rendu derrière la licence Studio, puis refusent l'exemple avec la liste", async () => {
    await CREER(requete({ format: "explainer", nom: "essai" }));
    process.env.WEBGEN_MOTION_EDITION = "community";
    resetEditionCache();
    expect((await RENDRE(requete({ id: "essai", declinaison: "Explainer-FR" }))).status).toBe(403);
    process.env.WEBGEN_MOTION_EDITION = "studio";
    resetEditionCache();
    const refus = await RENDRE(requete({ id: "essai", declinaison: "Explainer-FR" }));
    expect(refus.status).toBe(400);
    expect((await refus.json()).erreurs[0]).toMatch(/contenu d'EXEMPLE/);
  });
});
