import type { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

import { resetEditionCache } from "@/lib/edition";
import { POST } from "./route";

// Le parcours complet est couvert par lib/cinema/export-otio-episode.test.ts ;
// ici, la porte Studio et les réponses de la route elle-même.
const ORIGINE = process.env.WEBGEN_MOTION_EDITION;
function edition(valeur: string): void {
  process.env.WEBGEN_MOTION_EDITION = valeur;
  resetEditionCache();
}
afterEach(() => {
  resetEditionCache();
  if (ORIGINE === undefined) delete process.env.WEBGEN_MOTION_EDITION;
  else process.env.WEBGEN_MOTION_EDITION = ORIGINE;
});

const requete = (corps: unknown) => ({ json: async () => corps }) as unknown as NextRequest;
const contexte = (id: string, episode: string) => ({ params: Promise.resolve({ id, episode }) });

describe("route d'export .otio d'un épisode", () => {
  it("en Community, l'export est refusé (403) avant toute lecture", async () => {
    edition("community");
    const reponse = await POST(requete({ declinaison: "Court-FR" }), contexte("saya", "ep1"));
    expect(reponse.status).toBe(403);
    expect(await reponse.json()).toMatchObject({ error: "studio-required" });
  });

  it("en Studio, un film inconnu répond 404 avec une phrase", async () => {
    edition("studio");
    const reponse = await POST(requete({ declinaison: "Court-FR" }), contexte("film-qui-n-existe-pas", "ep1"));
    expect(reponse.status).toBe(404);
    expect(await reponse.json()).toEqual({ erreur: "Film introuvable" });
  });

  it("un id qui tente de sortir du dossier est traité comme inconnu", async () => {
    edition("studio");
    const reponse = await POST(requete({ declinaison: "Court-FR" }), contexte("../../etc", "ep1"));
    expect(reponse.status).toBe(404);
  });

  it("une requête illisible répond 400", async () => {
    edition("studio");
    const illisible = { json: async () => { throw new SyntaxError("x"); } } as unknown as NextRequest;
    const reponse = await POST(illisible, contexte("saya", "ep1"));
    expect(reponse.status).toBe(400);
  });
});
