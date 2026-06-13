import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { generateKeyPairSync, type KeyObject } from "node:crypto";
import {
  resolveSigningKey,
  sendLicenseEmail,
  fulfillCheckout,
  type FulfillmentEnv,
} from "./fulfillment";

/**
 * Tests du fulfillment automatique (P2.1) : résolution de clé, envoi
 * Resend (mocké via fetch), et orchestration émission → email avec ses
 * branches d'erreur / fallback dev.
 */

function pemPrivate(priv: KeyObject): string {
  return priv.export({ format: "pem", type: "pkcs8" }) as string;
}
const KEY_PEM = pemPrivate(generateKeyPairSync("ed25519").privateKey);

let fetchMock: Mock;
beforeEach(() => {
  fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("resolveSigningKey", () => {
  it("lit la clé PEM brute", () => {
    expect(resolveSigningKey({ LICENSE_SIGNING_PRIVATE_KEY: KEY_PEM })).toBe(
      KEY_PEM,
    );
  });
  it("décode la clé fournie en base64", () => {
    const b64 = Buffer.from(KEY_PEM, "utf-8").toString("base64");
    expect(
      resolveSigningKey({ LICENSE_SIGNING_PRIVATE_KEY_B64: b64 }),
    ).toBe(KEY_PEM);
  });
  it("retourne null si aucune clé", () => {
    expect(resolveSigningKey({})).toBeNull();
    expect(resolveSigningKey({ LICENSE_SIGNING_PRIVATE_KEY: "  " })).toBeNull();
  });
});

describe("sendLicenseEmail", () => {
  const base = { to: "buyer@x.io", licenseContent: "LIC", edition: "studio" as const };

  it("POST sur l'API Resend avec la licence en pièce jointe", async () => {
    const env: FulfillmentEnv = { RESEND_API_KEY: "re_123" };
    const r = await sendLicenseEmail(base, env);
    expect(r.sent).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer re_123",
    );
    const payload = JSON.parse(init.body as string);
    expect(payload.to).toEqual(["buyer@x.io"]);
    expect(payload.attachments[0].filename).toMatch(/\.license$/);
    // La licence est bien encodée en base64 dans la pièce jointe.
    expect(Buffer.from(payload.attachments[0].content, "base64").toString()).toBe(
      "LIC",
    );
  });

  it("skip proprement si RESEND_API_KEY absente (dev)", async () => {
    const r = await sendLicenseEmail(base, {});
    expect(r).toEqual({ sent: false, skipped: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("remonte une erreur si Resend répond non-2xx", async () => {
    fetchMock.mockResolvedValueOnce(new Response("nope", { status: 500 }));
    const r = await sendLicenseEmail(base, { RESEND_API_KEY: "re_123" });
    expect(r.sent).toBe(false);
    expect(r.error).toContain("500");
  });
});

describe("fulfillCheckout", () => {
  const input = { email: "buyer@x.io", edition: "studio" as const, reference: "cs_1" };

  it("clé absente → no-signing-key, non retryable (fallback manuel)", async () => {
    const r = await fulfillCheckout(input, {});
    expect(r).toMatchObject({
      licensed: false,
      emailed: false,
      reason: "no-signing-key",
      retryable: false,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("succès complet → licence émise + email envoyé", async () => {
    const r = await fulfillCheckout(input, {
      LICENSE_SIGNING_PRIVATE_KEY: KEY_PEM,
      RESEND_API_KEY: "re_123",
    });
    expect(r.licensed).toBe(true);
    expect(r.emailed).toBe(true);
    expect(r.retryable).toBe(false);
    expect(r.licenseContent).toContain("WEBGEN-MOTION LICENSE");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("clé OK mais Resend absent → licence émise, email skipped, pas de retry", async () => {
    const r = await fulfillCheckout(input, { LICENSE_SIGNING_PRIVATE_KEY: KEY_PEM });
    expect(r).toMatchObject({
      licensed: true,
      emailed: false,
      reason: "email-skipped-no-key",
      retryable: false,
    });
  });

  it("Resend en erreur → licence émise mais retryable (Stripe retentera)", async () => {
    fetchMock.mockResolvedValueOnce(new Response("boom", { status: 502 }));
    const r = await fulfillCheckout(input, {
      LICENSE_SIGNING_PRIVATE_KEY: KEY_PEM,
      RESEND_API_KEY: "re_123",
    });
    expect(r).toMatchObject({
      licensed: true,
      emailed: false,
      reason: "email-error",
      retryable: true,
    });
  });

  it("clé présente mais invalide → issue-error, non retryable", async () => {
    const r = await fulfillCheckout(input, {
      LICENSE_SIGNING_PRIVATE_KEY: "clé bidon",
      RESEND_API_KEY: "re_123",
    });
    expect(r).toMatchObject({
      licensed: false,
      reason: "issue-error",
      retryable: false,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
