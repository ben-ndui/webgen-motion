import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type Mock,
} from "vitest";
import Stripe from "stripe";
import { generateKeyPairSync } from "node:crypto";
import type { NextRequest } from "next/server";
import { POST, __resetWebhookIdempotency } from "./route";

/**
 * Tests du webhook Stripe avec fulfillment AUTOMATIQUE (P2.1).
 * Events signés via `generateTestHeaderString` (HMAC réel). Réseau
 * mocké : `fetch` distingue Resend (api.resend.com) et Discord.
 */

const WEBHOOK_SECRET = "whsec_test_secret";
const signer = new Stripe("sk_test_dummy");
const SIGNING_KEY = generateKeyPairSync("ed25519").privateKey.export({
  format: "pem",
  type: "pkcs8",
}) as string;

function buildEvent(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    id: "evt_" + Math.random().toString(36).slice(2),
    object: "event",
    type: "checkout.session.completed",
    livemode: false,
    data: {
      object: {
        id: "cs_test_123",
        customer_details: { email: "buyer@example.com", name: "Buyer" },
        amount_total: 4900,
        currency: "usd",
      },
    },
    ...overrides,
  });
}

function makeRequest(body: string, sig: string | null): NextRequest {
  const headers = new Headers({ "content-type": "application/json" });
  if (sig !== null) headers.set("stripe-signature", sig);
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers,
    body,
  }) as unknown as NextRequest;
}

function sign(body: string): string {
  return signer.webhooks.generateTestHeaderString({
    payload: body,
    secret: WEBHOOK_SECRET,
  });
}

/** Compte les appels Resend vs Discord depuis le mock fetch. */
function callCounts(fetchMock: Mock) {
  let resend = 0;
  let discord = 0;
  for (const [url] of fetchMock.mock.calls) {
    const u = String(url);
    if (u.includes("api.resend.com")) resend++;
    else discord++;
  }
  return { resend, discord };
}

let fetchMock: Mock;
const envKeys = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "WEBGEN_MOTION_DISCORD_WEBHOOK",
  "LICENSE_SIGNING_PRIVATE_KEY",
  "RESEND_API_KEY",
];
let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = {};
  for (const k of envKeys) savedEnv[k] = process.env[k];
  process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
  process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
  process.env.WEBGEN_MOTION_DISCORD_WEBHOOK =
    "https://discord.com/api/webhooks/x/y";
  process.env.LICENSE_SIGNING_PRIVATE_KEY = SIGNING_KEY;
  process.env.RESEND_API_KEY = "re_test";
  fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  __resetWebhookIdempotency();
});
afterEach(() => {
  for (const k of envKeys) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  vi.unstubAllGlobals();
});

describe("POST /api/stripe/webhook — signature", () => {
  it("rejette sans header stripe-signature (400)", async () => {
    const res = await POST(makeRequest(buildEvent(), null));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renvoie 500 si STRIPE_WEBHOOK_SECRET absent", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const res = await POST(makeRequest(buildEvent(), "t=1,v1=x"));
    expect(res.status).toBe(500);
  });

  it("rejette une signature invalide (400)", async () => {
    const body = buildEvent();
    const res = await POST(makeRequest(body, "t=1,v1=falsified"));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/stripe/webhook — fulfillment auto", () => {
  it("achat valide → licence émise + email envoyé, sans humain (200)", async () => {
    const body = buildEvent();
    const res = await POST(makeRequest(body, sign(body)));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      received: true,
      fulfilled: true,
      emailed: true,
    });
    const c = callCounts(fetchMock);
    expect(c.resend).toBe(1); // email client envoyé
    expect(c.discord).toBe(1); // notif best-effort
  });

  it("ignore un type d'event non attendu (200, aucune action)", async () => {
    const body = buildEvent({ type: "payment_intent.created" });
    const res = await POST(makeRequest(body, sign(body)));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ ignored: "payment_intent.created" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("session sans email → pas de fulfillment (200, reason no-email)", async () => {
    const body = buildEvent({
      data: { object: { id: "cs_x", customer_details: {}, amount_total: 4900, currency: "usd" } },
    });
    const res = await POST(makeRequest(body, sign(body)));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ fulfilled: false, reason: "no-email" });
  });

  it("clé de signature absente → licence non émise mais acquittée + Discord fallback", async () => {
    delete process.env.LICENSE_SIGNING_PRIVATE_KEY;
    const body = buildEvent();
    const res = await POST(makeRequest(body, sign(body)));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      fulfilled: false,
      reason: "no-signing-key",
    });
    const c = callCounts(fetchMock);
    expect(c.resend).toBe(0);
    expect(c.discord).toBe(1); // fallback manuel signalé
  });
});

describe("POST /api/stripe/webhook — idempotence retry-safe", () => {
  it("dédoublonne un event rejoué → fulfillment une seule fois", async () => {
    const body = buildEvent({ id: "evt_dup" });
    const sig = sign(body);
    const first = await POST(makeRequest(body, sig));
    const second = await POST(makeRequest(body, sig));
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    await expect(second.json()).resolves.toMatchObject({ duplicate: true });
    expect(callCounts(fetchMock).resend).toBe(1); // une seule licence emailée
  });

  it("échec Resend transitoire → 500 NON marqué traité → un retry réussit", async () => {
    // 1er appel Resend KO (502), Discord OK ; puis tout OK au retry.
    let resendCalls = 0;
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes("api.resend.com")) {
        resendCalls += 1;
        if (resendCalls === 1) return new Response("boom", { status: 502 });
      }
      return new Response("{}", { status: 200 });
    });
    const body = buildEvent({ id: "evt_retry" });
    const sig = sign(body);
    const first = await POST(makeRequest(body, sig));
    expect(first.status).toBe(500); // retryable → Stripe retentera

    const second = await POST(makeRequest(body, sig));
    expect(second.status).toBe(200);
    await expect(second.json()).resolves.toMatchObject({ emailed: true });
  });
});
