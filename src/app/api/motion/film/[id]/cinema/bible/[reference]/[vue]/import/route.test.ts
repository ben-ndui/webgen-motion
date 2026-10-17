import type { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

import { resetEditionCache } from "@/lib/edition";
import { POST } from "./route";

// La porte Studio, la vue invalide et l'absence de fichier se testent par la
// route ; l'import lui-même est couvert par lib/cinema/bible/generation.test.ts.
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
function requeteAvec(donnees: FormData): NextRequest {
  return new Request("http://test/import", { method: "POST", body: donnees }) as unknown as NextRequest;
}

describe("route import d'une vue de la bible", () => {
  it("en Community : 403, avant toute lecture", async () => {
    edition("community");
    const reponse = await POST(requeteAvec(new FormData()), contexte("saya", "awa", "face"));
    expect(reponse.status).toBe(403);
  });

  it("une vue inconnue : 400", async () => {
    edition("studio");
    const reponse = await POST(requeteAvec(new FormData()), contexte("saya", "awa", "de-cote"));
    expect(reponse.status).toBe(400);
  });

  it("aucun fichier reçu : 400", async () => {
    edition("studio");
    const reponse = await POST(requeteAvec(new FormData()), contexte("saya", "awa", "face"));
    expect(reponse.status).toBe(400);
    expect(await reponse.json()).toEqual({ erreur: "Aucune image reçue" });
  });

  // Le film inconnu + fichier présent (avant l'import lui-même, couvert par
  // lib/cinema/bible/generation.test.ts) n'est pas testé ici : jsdom ne fait
  // pas survivre un Blob au aller-retour FormData -> Request -> formData().
});
