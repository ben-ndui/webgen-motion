import type { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

import { GET } from "./route";

const ORIGINE = process.env.WEBGEN_DESKTOP_TOKEN;
afterEach(() => {
  if (ORIGINE === undefined) delete process.env.WEBGEN_DESKTOP_TOKEN;
  else process.env.WEBGEN_DESKTOP_TOKEN = ORIGINE;
});

function requete(entetes: Record<string, string>): NextRequest {
  return { headers: new Headers(entetes) } as unknown as NextRequest;
}

describe("GET /api/desktop/jeton", () => {
  it("dans l'app, donne le jeton à la page locale de même origine", async () => {
    process.env.WEBGEN_DESKTOP_TOKEN = "jeton-de-session";
    const reponse = GET(requete({ host: "127.0.0.1:3030", "sec-fetch-site": "same-origin" }));
    expect(reponse.status).toBe(200);
    expect(await reponse.json()).toEqual({ jeton: "jeton-de-session" });
    expect(reponse.headers.get("Cache-Control")).toBe("no-store");
  });

  it("refuse un hôte qui n'est pas local (rebinding DNS)", async () => {
    process.env.WEBGEN_DESKTOP_TOKEN = "jeton-de-session";
    const reponse = GET(requete({ host: "site-malveillant.com", "sec-fetch-site": "same-origin" }));
    expect(reponse.status).toBe(403);
    expect(await reponse.json()).toEqual({ jeton: null });
  });

  it("refuse une demande venue d'un autre site", async () => {
    process.env.WEBGEN_DESKTOP_TOKEN = "jeton-de-session";
    const reponse = GET(requete({ host: "127.0.0.1:3030", "sec-fetch-site": "cross-site" }));
    expect(reponse.status).toBe(403);
  });

  it("sur le web (pas de jeton), répond null sans erreur", async () => {
    delete process.env.WEBGEN_DESKTOP_TOKEN;
    const reponse = GET(requete({ host: "genmotion.app" }));
    expect(await reponse.json()).toEqual({ jeton: null });
  });
});
