import type { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

import { resetEditionCache } from "@/lib/edition";
import { POST } from "./route";

// La porte Studio et la vue invalide se testent par la route ; la
// génération est couverte par lib/cinema/bible/generation.test.ts.
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

const requete = {} as NextRequest;
const contexte = (id: string, reference: string, vue: string) => ({ params: Promise.resolve({ id, reference, vue }) });

describe("route génération d'une vue de la bible", () => {
  it("en Community : 403, avant toute lecture", async () => {
    edition("community");
    const reponse = await POST(requete, contexte("saya", "awa", "face"));
    expect(reponse.status).toBe(403);
  });

  it("une vue inconnue : 400, avant toute lecture du film", async () => {
    edition("studio");
    const reponse = await POST(requete, contexte("film-qui-n-existe-pas", "awa", "de-cote"));
    expect(reponse.status).toBe(400);
    expect(await reponse.json()).toEqual({ erreur: "Vue inconnue : « de-cote »" });
  });

  it("en Studio, un film inconnu répond 404 avec une phrase", async () => {
    edition("studio");
    const reponse = await POST(requete, contexte("film-qui-n-existe-pas", "awa", "face"));
    expect(reponse.status).toBe(404);
    expect(await reponse.json()).toEqual({ erreur: "Film introuvable" });
  });
});
