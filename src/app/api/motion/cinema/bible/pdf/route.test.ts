import type { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

import { resetEditionCache } from "@/lib/edition";
import { POST } from "./route";

// La porte Studio et l'absence de fichier se testent par la route ;
// l'extraction elle-même est couverte par lib/cinema/bible/pdf.test.ts — comme
// pour l'import d'une vue de la bible, jsdom ne fait pas survivre un Blob au
// aller-retour FormData -> Request -> formData().
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

function requeteAvec(donnees: FormData): NextRequest {
  return new Request("http://test/pdf", { method: "POST", body: donnees }) as unknown as NextRequest;
}

describe("route extraction du texte d'un PDF de bible", () => {
  it("en Community : 403, avant toute lecture", async () => {
    edition("community");
    const reponse = await POST(requeteAvec(new FormData()));
    expect(reponse.status).toBe(403);
  });

  it("aucun fichier reçu : 400", async () => {
    edition("studio");
    const reponse = await POST(requeteAvec(new FormData()));
    expect(reponse.status).toBe(400);
    expect(await reponse.json()).toEqual({ erreur: "Aucun fichier reçu" });
  });
});
