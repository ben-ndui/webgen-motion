import type { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

import { resetEditionCache } from "@/lib/edition";
import { GET } from "./route";

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
const contexte = (id: string, plan: string) => ({ params: Promise.resolve({ id, plan }) });

describe("route liste des prises d'un plan", () => {
  it("en Community : 403", async () => {
    edition("community");
    expect((await GET(requete, contexte("saya", "rangement"))).status).toBe(403);
  });

  it("en Studio, un film inconnu répond 404", async () => {
    edition("studio");
    const reponse = await GET(requete, contexte("film-qui-n-existe-pas", "rangement"));
    expect(reponse.status).toBe(404);
    expect(await reponse.json()).toEqual({ erreur: "Film introuvable" });
  });
});
