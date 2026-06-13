import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolvePlan, isStudioPlan, SUBSCRIPTION_GRACE_MS } from "./stripe-plans";

describe("isStudioPlan", () => {
  it("accepte les 3 plans valides", () => {
    expect(isStudioPlan("monthly")).toBe(true);
    expect(isStudioPlan("annual")).toBe(true);
    expect(isStudioPlan("lifetime")).toBe(true);
  });
  it("rejette tout le reste", () => {
    for (const v of ["", "studio", "yearly", null, undefined, 1, {}]) {
      expect(isStudioPlan(v)).toBe(false);
    }
  });
});

describe("resolvePlan", () => {
  const KEYS = [
    "STRIPE_PRICE_STUDIO_MONTHLY",
    "STRIPE_PRICE_STUDIO_ANNUAL",
    "STRIPE_PRICE_STUDIO_LIFETIME",
    "STRIPE_PRICE_ID",
  ] as const;
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });
  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("null si le price du plan n'est pas configuré", () => {
    expect(resolvePlan("monthly")).toBeNull();
    expect(resolvePlan("annual")).toBeNull();
    expect(resolvePlan("lifetime")).toBeNull();
  });

  it("monthly/annual → mode subscription", () => {
    process.env.STRIPE_PRICE_STUDIO_MONTHLY = "price_m";
    process.env.STRIPE_PRICE_STUDIO_ANNUAL = "price_a";
    expect(resolvePlan("monthly")).toEqual({
      plan: "monthly",
      priceId: "price_m",
      mode: "subscription",
      edition: "studio",
    });
    expect(resolvePlan("annual")?.mode).toBe("subscription");
  });

  it("lifetime → mode payment", () => {
    process.env.STRIPE_PRICE_STUDIO_LIFETIME = "price_l";
    expect(resolvePlan("lifetime")).toEqual({
      plan: "lifetime",
      priceId: "price_l",
      mode: "payment",
      edition: "studio",
    });
  });

  it("lifetime retombe sur l'ancien STRIPE_PRICE_ID (rétro-compat)", () => {
    process.env.STRIPE_PRICE_ID = "price_legacy";
    expect(resolvePlan("lifetime")?.priceId).toBe("price_legacy");
  });

  it("STRIPE_PRICE_STUDIO_LIFETIME prime sur l'ancien STRIPE_PRICE_ID", () => {
    process.env.STRIPE_PRICE_STUDIO_LIFETIME = "price_new";
    process.env.STRIPE_PRICE_ID = "price_legacy";
    expect(resolvePlan("lifetime")?.priceId).toBe("price_new");
  });
});

describe("SUBSCRIPTION_GRACE_MS", () => {
  it("vaut 3 jours", () => {
    expect(SUBSCRIPTION_GRACE_MS).toBe(3 * 24 * 60 * 60 * 1000);
  });
});
