import type { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

import { resetEditionCache } from "@/lib/edition";
import { POST } from "./route";

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
const contexte = (id: string, reference: string) => ({ params: Promise.resolve({ id, reference }) });

describe("route valider une référence de la bible", () => {
  it("en Community : 403", async () => {
    edition("community");
    expect((await POST(requete, contexte("saya", "awa"))).status).toBe(403);
  });

  it("en Studio, un film inconnu répond 404", async () => {
    edition("studio");
    const reponse = await POST(requete, contexte("film-qui-n-existe-pas", "awa"));
    expect(reponse.status).toBe(404);
    expect(await reponse.json()).toEqual({ erreur: "Film introuvable" });
  });
});
