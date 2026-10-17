import type { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

import { resetEditionCache } from "@/lib/edition";
import { DELETE, POST } from "./route";

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
const contexte = (id: string, plan: string, n: string) => ({ params: Promise.resolve({ id, plan, n }) });

describe("route retenir/supprimer une prise", () => {
  it("en Community : 403, pour les deux verbes", async () => {
    edition("community");
    for (const verbe of [POST, DELETE]) {
      expect((await verbe(requete, contexte("saya", "rangement", "1"))).status).toBe(403);
    }
  });

  it("un numéro de prise invalide : 400, avant toute lecture du film", async () => {
    edition("studio");
    for (const n of ["0", "-1", "deux", "1.5"]) {
      expect((await POST(requete, contexte("film-qui-n-existe-pas", "rangement", n))).status).toBe(400);
    }
  });

  it("en Studio, un film inconnu répond 404, pour les deux verbes", async () => {
    edition("studio");
    for (const verbe of [POST, DELETE]) {
      const reponse = await verbe(requete, contexte("film-qui-n-existe-pas", "rangement", "1"));
      expect(reponse.status).toBe(404);
      expect(await reponse.json()).toEqual({ erreur: "Film introuvable" });
    }
  });
});
