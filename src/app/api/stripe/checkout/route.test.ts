import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "./route";

function demande(corps: unknown) {
  return new NextRequest("http://localhost/api/stripe/checkout", { method: "POST", body: JSON.stringify(corps) });
}

describe("POST /api/stripe/checkout", () => {
  it("refuse de payer sans la case « achat professionnel » cochée", async () => {
    for (const corps of [{ plan: "monthly" }, { plan: "annual", achatProfessionnel: "true" }, { plan: "lifetime", achatProfessionnel: false }]) {
      const reponse = await POST(demande(corps));
      expect(reponse.status).toBe(400);
      expect((await reponse.json()).error).toContain("réservée aux professionnels");
    }
  });

  it("un corps illisible n'est pas un consentement", async () => {
    const reponse = await POST(new NextRequest("http://localhost/api/stripe/checkout", { method: "POST", body: "pas du json" }));
    expect(reponse.status).toBe(400);
  });
});
