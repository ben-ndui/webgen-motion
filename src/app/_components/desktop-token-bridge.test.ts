import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Le cas de la 0.7.0 locale : l'app s'ouvre sur l'accueil STATIQUE (balise
 * de jeton vide) puis passe au studio par un lien interne. Les appels
 * /api/motion doivent quand même partir signés.
 */
async function chargerLePont(balise: string | null, jetonDuServeur: string | null) {
  vi.resetModules();
  document.head.innerHTML = balise === null ? "" : `<meta name="webgen-desktop-token" content="${balise}">`;
  const appels: { url: string; jeton: string | null }[] = [];
  const fetchDOrigine = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    appels.push({ url, jeton: new Headers(init?.headers).get("x-webgen-desktop-token") });
    if (url === "/api/desktop/jeton") return new Response(JSON.stringify({ jeton: jetonDuServeur }));
    return new Response("{}");
  });
  const w = window as unknown as Record<string, unknown>;
  delete w.__webgenMotionFetchPatched__;
  window.fetch = fetchDOrigine as unknown as typeof window.fetch;
  await import("./desktop-token-bridge");
  return { appels };
}

describe("pont du jeton desktop", () => {
  afterEach(() => vi.restoreAllMocks());

  it("balise vide (accueil statique) : le jeton est demandé au serveur, l'appel part signé", async () => {
    const { appels } = await chargerLePont("", "jeton-de-session");
    await window.fetch("/api/motion/film", { method: "POST" });
    await window.fetch("/api/motion/film/x/render", { method: "POST" });
    expect(appels.filter((a) => a.url === "/api/desktop/jeton")).toHaveLength(1);
    expect(appels.filter((a) => a.url.startsWith("/api/motion")).map((a) => a.jeton)).toEqual(["jeton-de-session", "jeton-de-session"]);
  });

  it("balise remplie : on s'en sert, sans demander au serveur", async () => {
    const { appels } = await chargerLePont("jeton-de-la-page", "autre");
    await window.fetch("/api/motion/film", { method: "POST" });
    expect(appels).toEqual([{ url: "/api/motion/film", jeton: "jeton-de-la-page" }]);
  });

  it("sur le web (le serveur n'a pas de jeton) : appel envoyé tel quel", async () => {
    const { appels } = await chargerLePont(null, null);
    await window.fetch("/api/motion/film", { method: "POST" });
    expect(appels.at(-1)).toEqual({ url: "/api/motion/film", jeton: null });
  });

  it("un appel hors de /api/motion n'est jamais touché", async () => {
    const { appels } = await chargerLePont("", "jeton-de-session");
    await window.fetch("/api/version");
    expect(appels).toEqual([{ url: "/api/version", jeton: null }]);
  });
});
