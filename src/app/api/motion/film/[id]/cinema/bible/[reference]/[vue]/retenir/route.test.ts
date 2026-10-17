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

const contexte = (id: string, reference: string, vue: string) => ({ params: Promise.resolve({ id, reference, vue }) });
function requeteAvec(corps: unknown): NextRequest {
  return new Request("http://test/retenir", { method: "POST", body: JSON.stringify(corps) }) as unknown as NextRequest;
}

describe("route retenir une version de la bible", () => {
  it("en Community : 403", async () => {
    edition("community");
    expect((await POST(requeteAvec({ n: 1 }), contexte("saya", "awa", "face"))).status).toBe(403);
  });

  it("une vue inconnue : 400", async () => {
    edition("studio");
    expect((await POST(requeteAvec({ n: 1 }), contexte("saya", "awa", "de-cote"))).status).toBe(400);
  });

  it("un n manquant ou non entier : 400", async () => {
    edition("studio");
    expect((await POST(requeteAvec({}), contexte("saya", "awa", "face"))).status).toBe(400);
    expect((await POST(requeteAvec({ n: "1" }), contexte("saya", "awa", "face"))).status).toBe(400);
  });

  it("en Studio, un film inconnu répond 404", async () => {
    edition("studio");
    const reponse = await POST(requeteAvec({ n: 1 }), contexte("film-qui-n-existe-pas", "awa", "face"));
    expect(reponse.status).toBe(404);
    expect(await reponse.json()).toEqual({ erreur: "Film introuvable" });
  });
});
