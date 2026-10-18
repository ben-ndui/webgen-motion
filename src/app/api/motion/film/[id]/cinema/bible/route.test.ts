import type { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

import { resetEditionCache } from "@/lib/edition";
import { GET } from "./route";

// La porte Studio se teste par la route elle-même : la lecture de la bible
// est couverte par lib/cinema/bible/lecture.test.ts.
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
const contexte = (id: string) => ({ params: Promise.resolve({ id }) });

describe("route bible d'une série", () => {
  it("en Community : 403, avant toute lecture", async () => {
    edition("community");
    const reponse = await GET(requete, contexte("saya"));
    expect(reponse.status).toBe(403);
    expect(await reponse.json()).toMatchObject({ error: "studio-required" });
  });

  it("en Studio, un film inconnu répond 404 avec une phrase", async () => {
    edition("studio");
    const reponse = await GET(requete, contexte("film-qui-n-existe-pas"));
    expect(reponse.status).toBe(404);
    expect(await reponse.json()).toEqual({ erreur: "Film introuvable" });
  });
});
