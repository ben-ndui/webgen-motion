import type { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

import { resetEditionCache } from "@/lib/edition";
import { GET, POST } from "./route";

// La porte Studio se teste par la route elle-même : le parcours payant est
// couvert par lib/cinema/generation.test.ts contre un faux Google local.
const ORIGINE = process.env.WEBGEN_MOTION_EDITION;
// L'édition est mise en cache : on la relit à chaque changement d'environnement.
function edition(valeur: string): void {
  process.env.WEBGEN_MOTION_EDITION = valeur;
  resetEditionCache();
}
afterEach(() => {
  resetEditionCache();
  if (ORIGINE === undefined) delete process.env.WEBGEN_MOTION_EDITION;
  else process.env.WEBGEN_MOTION_EDITION = ORIGINE;
});

const requete = {} as NextRequest;
const contexte = (id: string, plan: string) => ({ params: Promise.resolve({ id, plan }) });

describe("route cinéma d'un plan", () => {
  it("en Community, lancer ET suivre sont refusés (403), avant toute lecture", async () => {
    edition("community");
    for (const verbe of [POST, GET]) {
      const reponse = await verbe(requete, contexte("saya", "jardin"));
      expect(reponse.status).toBe(403);
      expect(await reponse.json()).toMatchObject({ error: "studio-required" });
    }
  });

  it("en Studio, un film inconnu répond 404 avec une phrase, pas une exception", async () => {
    edition("studio");
    const reponse = await POST(requete, contexte("film-qui-n-existe-pas", "jardin"));
    expect(reponse.status).toBe(404);
    expect(await reponse.json()).toEqual({ erreur: "Film introuvable" });
  });

  it("un id qui tente de sortir du dossier est traité comme inconnu", async () => {
    edition("studio");
    const reponse = await GET(requete, contexte("../../etc", "jardin"));
    expect(reponse.status).toBe(404);
  });
});
