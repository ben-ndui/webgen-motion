import type { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

import { resetEditionCache } from "@/lib/edition";
import { POST } from "./route";

// La porte Studio et les erreurs se testent par la route ; la génération du
// portrait est couverte par lib/cinema/generation-portrait.test.ts.
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

const contexte = (id: string, personnage: string) => ({ params: Promise.resolve({ id, personnage }) });

describe("route portrait d'un personnage", () => {
  it("en Community : 403, avant toute lecture", async () => {
    edition("community");
    const reponse = await POST({} as NextRequest, contexte("saya", "awa"));
    expect(reponse.status).toBe(403);
    expect(await reponse.json()).toMatchObject({ error: "studio-required" });
  });

  it("en Studio, un film inconnu répond 404 avec une phrase", async () => {
    edition("studio");
    const reponse = await POST({} as NextRequest, contexte("film-qui-n-existe-pas", "awa"));
    expect(reponse.status).toBe(404);
    expect(await reponse.json()).toEqual({ erreur: "Film introuvable" });
  });
});
