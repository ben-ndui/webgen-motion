import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import type { AppelerClaude } from "../cinema/scenario-claude";
import type { ResolvedAgent } from "../config-resolve";
import { dossierJetable, ecrireFiche, ficheValide } from "../film-fixtures.test-utils";
import type { LectureDuSite } from "../site/lecture-du-site";
import { garderLaMemoire } from "../site/memoire-du-site";
import { reecrireUneSection } from "./reecrire-une-section";

const AGENT = { provider: "anthropic", apiKey: "cle-de-test", model: "claude-test" } as ResolvedAgent;

function preparer() {
  const fiches = dossierJetable("reecriture-fiches");
  const films = dossierJetable("reecriture-films");
  const spec = ficheValide();
  spec.marque.nom = "Maison Saya";
  ecrireFiche(fiches, "saya", spec);
  const dossier = (id: string) => join(films, id);
  mkdirSync(dossier("saya"), { recursive: true });
  return { lieux: { fiches, dossier }, dossier };
}

function fauxClaude(reponse: unknown) {
  const messages: string[] = [];
  const appeler: AppelerClaude = vi.fn(async (_agent, _systeme, message) => {
    messages.push(message);
    return { ok: true as const, texte: JSON.stringify(reponse) };
  });
  return { appeler, messages };
}

const LECTURE = {
  url: "https://maisonsaya.fr", titre: "Maison Saya", description: "Parfums naturels", langue: "fr", nomDuSite: "Maison Saya",
  logos: [], couleurs: [], polices: [], liens: [{ url: "https://maisonsaya.fr/boutique", texte: "Boutique", dansLeMenu: true }],
  textes: { titres: ["Nos parfums"], paragraphes: ["1 200 clientes fidèles"], boutons: [], chiffres: ["1 200 clientes"] },
} as LectureDuSite;

describe("reecrireUneSection", () => {
  it("réécrit la section avec la consigne et les faits du site gardés au remplissage", async () => {
    const { lieux, dossier } = preparer();
    garderLaMemoire("saya", LECTURE, dossier);
    const { appeler, messages } = fauxClaude({ champs: { "evenement.chute": "Un parfum qui vous ressemble enfin" } });
    const reponse = await reecrireUneSection("saya", { langue: "fr", section: "moment", consigne: "plus intime", aEviter: ["Ancienne proposition"] }, lieux, AGENT, appeler);
    expect(reponse).toEqual({ ok: true, champs: { "evenement.chute": "Un parfum qui vous ressemble enfin" }, aEcrireSoiMeme: [] });
    expect(messages[0]).toContain("Brand: Maison Saya");
    expect(messages[0]).toContain("« plus intime »");
    expect(messages[0]).toContain("1 200 clientes");
    expect(messages[0]).toContain("- Ancienne proposition");
  });

  it("refuse sans clé Claude, avec une phrase qui mène aux Réglages", async () => {
    const { lieux } = preparer();
    const reponse = await reecrireUneSection("saya", { langue: "fr", section: "moment" }, lieux, null, fauxClaude({}).appeler);
    expect(reponse).toMatchObject({ ok: false, statut: 412, raison: expect.stringContaining("Réglages") });
  });

  it("refuse une section inconnue, une langue que le film n'a pas, un film absent", async () => {
    const { lieux } = preparer();
    const { appeler } = fauxClaude({});
    expect(await reecrireUneSection("saya", { langue: "fr", section: "generique" }, lieux, AGENT, appeler)).toMatchObject({ statut: 400 });
    expect(await reecrireUneSection("saya", { langue: "de", section: "moment" }, lieux, AGENT, appeler)).toMatchObject({ statut: 400 });
    expect(await reecrireUneSection("absent", { langue: "fr", section: "moment" }, lieux, AGENT, appeler)).toMatchObject({ statut: 404 });
    expect(appeler).not.toHaveBeenCalled();
  });

  it("une consigne fleuve est coupée avant d'aller chez Claude", async () => {
    const { lieux } = preparer();
    const { appeler, messages } = fauxClaude({ champs: { "fin.disponible": "maisonsaya.fr" } });
    await reecrireUneSection("saya", { langue: "fr", section: "fin", consigne: "x".repeat(5000) }, lieux, AGENT, appeler);
    expect(messages[0]).toContain(`« ${"x".repeat(300)} »`);
    expect(messages[0]).not.toContain("x".repeat(301));
  });

  it("une réponse illisible de Claude est dite, pas avalée", async () => {
    const { lieux } = preparer();
    const appeler: AppelerClaude = async () => ({ ok: true, texte: "Je ne peux pas." });
    expect(await reecrireUneSection("saya", { langue: "fr", section: "fin" }, lieux, AGENT, appeler)).toMatchObject({ ok: false, statut: 502 });
  });
});
