import { describe, it, expect } from "vitest";
import {
  evaluateMotionAccess,
  isLocalHostname,
  isLocalOrigin,
  isPublicWebRuntime,
} from "./desktop-guard";

describe("isLocalHostname", () => {
  it("accepte localhost / loopback / *.localhost", () => {
    for (const h of [
      "localhost",
      "localhost:3000",
      "127.0.0.1",
      "127.0.0.1:3030",
      "[::1]:3030",
      "tauri.localhost",
      "app.localhost:1420",
    ]) {
      expect(isLocalHostname(h)).toBe(true);
    }
  });
  it("rejette les hosts distants", () => {
    for (const h of [
      "genmotion.app",
      "evil.com",
      "127.0.0.1.evil.com",
      "192.168.1.10",
      "",
      null,
      undefined,
    ]) {
      expect(isLocalHostname(h as string)).toBe(false);
    }
  });
});

describe("isLocalOrigin", () => {
  it("accepte origines locales + protocole tauri", () => {
    expect(isLocalOrigin("http://localhost:3000")).toBe(true);
    expect(isLocalOrigin("http://127.0.0.1:3030")).toBe(true);
    expect(isLocalOrigin("tauri://localhost")).toBe(true);
  });
  it("rejette origines distantes / malformées", () => {
    expect(isLocalOrigin("https://genmotion.app")).toBe(false);
    expect(isLocalOrigin("https://evil.com")).toBe(false);
    expect(isLocalOrigin("not-a-url")).toBe(false);
    expect(isLocalOrigin(null)).toBe(false);
  });
});

describe("isPublicWebRuntime", () => {
  it("détecte Vercel + flags explicites", () => {
    expect(isPublicWebRuntime({ VERCEL: "1" })).toBe(true);
    expect(isPublicWebRuntime({ VERCEL_ENV: "production" })).toBe(true);
    expect(isPublicWebRuntime({ WEBGEN_PUBLIC_WEB: "1" })).toBe(true);
    expect(isPublicWebRuntime({ WEBGEN_DISABLE_MOTION_API: "1" })).toBe(true);
  });
  it("retourne false en local", () => {
    expect(isPublicWebRuntime({})).toBe(false);
    expect(isPublicWebRuntime({ NODE_ENV: "development" })).toBe(false);
  });
});

describe("evaluateMotionAccess", () => {
  const localOk = {
    host: "127.0.0.1:3030",
    origin: "http://127.0.0.1:3030",
    isPublicWeb: false,
  };

  it("autorise une requête desktop locale", () => {
    const d = evaluateMotionAccess(localOk);
    expect(d.allow).toBe(true);
    expect(d.reason).toBe("ok");
  });

  it("autorise sans Origin (navigation directe / serveur)", () => {
    const d = evaluateMotionAccess({ ...localOk, origin: null });
    expect(d.allow).toBe(true);
  });

  it("refuse en web public même si tout le reste est local", () => {
    const d = evaluateMotionAccess({ ...localOk, isPublicWeb: true });
    expect(d.allow).toBe(false);
    expect(d.status).toBe(403);
    expect(d.reason).toBe("public-web");
  });

  it("refuse un Host non-local (anti DNS-rebinding)", () => {
    const d = evaluateMotionAccess({ ...localOk, host: "evil.com" });
    expect(d.allow).toBe(false);
    expect(d.reason).toBe("non-local-host");
  });

  it("refuse une Origin cross-site (anti CSRF)", () => {
    const d = evaluateMotionAccess({
      ...localOk,
      origin: "https://evil.com",
    });
    expect(d.allow).toBe(false);
    expect(d.reason).toBe("cross-origin");
  });

  describe("couche token (quand configurée)", () => {
    const withToken = { ...localOk, expectedToken: "secret-abc" };
    it("autorise avec le bon token", () => {
      const d = evaluateMotionAccess({
        ...withToken,
        providedToken: "secret-abc",
      });
      expect(d.allow).toBe(true);
    });
    it("refuse sans token", () => {
      const d = evaluateMotionAccess({ ...withToken, providedToken: null });
      expect(d.allow).toBe(false);
      expect(d.reason).toBe("missing-token");
    });
    it("refuse avec un mauvais token", () => {
      const d = evaluateMotionAccess({
        ...withToken,
        providedToken: "wrong",
      });
      expect(d.allow).toBe(false);
      expect(d.reason).toBe("bad-token");
    });
  });

  it("ignore le token quand non configuré (dev / self-host)", () => {
    const d = evaluateMotionAccess({
      ...localOk,
      expectedToken: "",
      providedToken: null,
    });
    expect(d.allow).toBe(true);
  });
});
