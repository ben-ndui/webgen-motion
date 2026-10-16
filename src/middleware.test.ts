import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

import { middleware } from "./middleware";

const ORIGINE = { jeton: process.env.WEBGEN_DESKTOP_TOKEN, vercel: process.env.VERCEL };
afterEach(() => {
  if (ORIGINE.jeton === undefined) delete process.env.WEBGEN_DESKTOP_TOKEN;
  else process.env.WEBGEN_DESKTOP_TOKEN = ORIGINE.jeton;
  if (ORIGINE.vercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = ORIGINE.vercel;
});

const requete = (url: string, entetes: Record<string, string> = {}) => new NextRequest(url, { headers: entetes });

describe("middleware — jeton de la fenêtre de l'app", () => {
  it("une page du studio, en local, dans l'app : le cookie du jeton est posé (HttpOnly, SameSite strict)", () => {
    process.env.WEBGEN_DESKTOP_TOKEN = "jeton-de-session";
    const cookie = middleware(requete("http://127.0.0.1:3030/dashboard", { host: "127.0.0.1:3030" })).headers.get("set-cookie") ?? "";
    expect(cookie).toContain("webgen_desktop_token=jeton-de-session");
    expect(cookie.toLowerCase()).toContain("httponly");
    expect(cookie.toLowerCase()).toContain("samesite=strict");
  });

  it("une <video> qui lit /api/motion avec ce seul cookie est acceptée (pas d'en-tête possible)", () => {
    process.env.WEBGEN_DESKTOP_TOKEN = "jeton-de-session";
    const video = requete("http://127.0.0.1:3030/api/motion/film/video?id=x&declinaison=y", { host: "127.0.0.1:3030", cookie: "webgen_desktop_token=jeton-de-session" });
    expect(middleware(video).status).not.toBe(403);
  });

  it("même requête sans cookie ni en-tête : refusée, comme avant", () => {
    process.env.WEBGEN_DESKTOP_TOKEN = "jeton-de-session";
    const video = requete("http://127.0.0.1:3030/api/motion/film/video?id=x", { host: "127.0.0.1:3030" });
    expect(middleware(video).status).toBe(403);
  });

  it("jamais de cookie pour un hôte étranger (rebinding DNS), ni sans jeton (le site public)", () => {
    process.env.WEBGEN_DESKTOP_TOKEN = "jeton-de-session";
    expect(middleware(requete("http://evil.test/dashboard", { host: "evil.test" })).headers.get("set-cookie")).toBeNull();
    delete process.env.WEBGEN_DESKTOP_TOKEN;
    expect(middleware(requete("https://genmotion.app/", { host: "genmotion.app" })).headers.get("set-cookie")).toBeNull();
  });

  it("cookie déjà à jour : pas réécrit à chaque page", () => {
    process.env.WEBGEN_DESKTOP_TOKEN = "jeton-de-session";
    const deja = requete("http://127.0.0.1:3030/film/x", { host: "127.0.0.1:3030", cookie: "webgen_desktop_token=jeton-de-session" });
    expect(middleware(deja).headers.get("set-cookie")).toBeNull();
  });
});
