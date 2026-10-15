import type { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

import { resetEditionCache } from "@/lib/edition";
import { serieSaya } from "../../../../../../../../remotion/film/cinema/serie-exemple.test-utils";
import { POST } from "./route";

// Les gestes eux-mêmes sont couverts par lib/cinema/assistant/assistant.test.ts
// (faux Claude) ; ici, la porte Studio et les réponses de la route.
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
const contexte = (id: string) => ({ params: Promise.resolve({ id }) });
const DEMANDE = { type: "replique", episode: "ep1", plan: "rangement" };

describe("route de l'assistant de la série", () => {
  it("en Community, refusée (403) avant tout appel à Claude", async () => {
    edition("community");
    const reponse = await POST(requete({ cinema: serieSaya(), demande: DEMANDE }), contexte("saya"));
    expect(reponse.status).toBe(403);
    expect(await reponse.json()).toMatchObject({ error: "studio-required" });
  });

  it("en Studio, une demande illisible répond 400 avec une phrase", async () => {
    edition("studio");
    const reponse = await POST(requete({ cinema: serieSaya(), demande: { type: "n-importe-quoi" } }), contexte("saya"));
    expect(reponse.status).toBe(400);
    expect(await reponse.json()).toEqual({ erreur: "Demande à l'assistant illisible." });
  });

  it("un corps illisible répond 400", async () => {
    edition("studio");
    const illisible = { json: async () => { throw new SyntaxError("x"); } } as unknown as NextRequest;
    expect((await POST(illisible, contexte("saya"))).status).toBe(400);
  });
});
