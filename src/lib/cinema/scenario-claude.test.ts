import { describe, expect, it, vi } from "vitest";

import type { ResolvedAgent } from "../config-resolve";
import { filmDeTest } from "./film-de-test.test-utils";
import { type AppelerClaude, appelerClaude, ecrireUnEpisode } from "./scenario-claude";

const AGENT: ResolvedAgent = { provider: "anthropic", apiKey: "cle-de-test", model: "claude-sonnet-4-6" };
const BRIEF = "Une cliente découvre que le parfum vient de la recette de sa grand-mère.";
const EPISODE = {
  titre: "L'héritage",
  objet: null,
  personnages: [{ nom: "Awa", description: "x" }],
  scenes: [{ decor: "The boutique at night.", plans: [{ consigne: "Awa smiles.", personnages: ["Awa"], objet: false, replique: { personnage: "Awa", texte: "Bienvenue." } }] }],
};

function film() {
  const f = filmDeTest("http://127.0.0.1:1/v1beta");
  f.creer();
  return f;
}

describe("ecrireUnEpisode", () => {
  it("propose la série avec le nouvel épisode, SANS toucher à la fiche", async () => {
    const f = film();
    const appeler = vi.fn<AppelerClaude>(async () => ({ ok: true, texte: "Voici :\n```json\n" + JSON.stringify(EPISODE) + "\n```" }));
    const reponse = await ecrireUnEpisode("saya", BRIEF, f.lieux, AGENT, appeler);
    expect(reponse).toMatchObject({ ok: true, episodeId: "ep2" });
    expect(appeler.mock.calls[0]![2]).toContain(BRIEF);
    expect(f.fiche().cinema?.episodes).toHaveLength(1);
  });

  it("sans clé Claude, ou avec une clé d'un autre fournisseur : 412, sans appel", async () => {
    const f = film();
    const appeler = vi.fn();
    expect(await ecrireUnEpisode("saya", BRIEF, f.lieux, null, appeler)).toMatchObject({ ok: false, statut: 412 });
    expect(await ecrireUnEpisode("saya", BRIEF, f.lieux, { ...AGENT, provider: "openai" }, appeler)).toMatchObject({ ok: false, statut: 412 });
    expect(appeler).not.toHaveBeenCalled();
  });

  it("brief trop court ou trop long : 400, sans appel", async () => {
    const f = film();
    const appeler = vi.fn();
    expect(await ecrireUnEpisode("saya", "court", f.lieux, AGENT, appeler)).toMatchObject({ ok: false, statut: 400 });
    expect(await ecrireUnEpisode("saya", "x".repeat(2001), f.lieux, AGENT, appeler)).toMatchObject({ ok: false, statut: 400, raison: expect.stringContaining("2001") });
    expect(appeler).not.toHaveBeenCalled();
  });

  it("Claude en échec, réponse illisible ou épisode qui ne tient pas : 502 avec une phrase", async () => {
    const f = film();
    expect(await ecrireUnEpisode("saya", BRIEF, f.lieux, AGENT, async () => ({ ok: false, raison: "Claude a répondu 529" }))).toMatchObject({ ok: false, statut: 502, raison: "Claude a répondu 529" });
    expect(await ecrireUnEpisode("saya", BRIEF, f.lieux, AGENT, async () => ({ ok: true, texte: "je ne sais pas" }))).toMatchObject({ ok: false, statut: 502, raison: expect.stringContaining("pas lisible") });
    const vide = JSON.stringify({ ...EPISODE, scenes: [] });
    expect(await ecrireUnEpisode("saya", BRIEF, f.lieux, AGENT, async () => ({ ok: true, texte: vide }))).toMatchObject({ ok: false, statut: 502, raison: expect.stringContaining("aucun plan") });
  });

  it("film inconnu : 404", async () => {
    const f = film();
    expect(await ecrireUnEpisode("inconnu", BRIEF, f.lieux, AGENT, vi.fn())).toMatchObject({ ok: false, statut: 404 });
  });
});

describe("appelerClaude — max_tokens", () => {
  it("envoie 6000 jetons par défaut, ou la valeur donnée pour un geste qui rend beaucoup de texte", async () => {
    const appels: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, options: RequestInit) => {
        appels.push(JSON.parse(String(options.body)));
        return new Response(JSON.stringify({ content: [{ type: "text", text: "{}" }] }), { status: 200 });
      }),
    );
    await appelerClaude(AGENT, "système", "message");
    await appelerClaude(AGENT, "système", "message", 8192);
    expect((appels[0] as { max_tokens: number }).max_tokens).toBe(6000);
    expect((appels[1] as { max_tokens: number }).max_tokens).toBe(8192);
    vi.unstubAllGlobals();
  });
});
