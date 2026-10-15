import { describe, expect, it, vi } from "vitest";

import { EXEMPLES_DE_SERIE } from "../../../../remotion/film/cinema/exemples";
import { serieSaya } from "../../../../remotion/film/cinema/serie-exemple.test-utils";
import type { ResolvedAgent } from "../../config-resolve";
import { filmDeTest } from "../film-de-test.test-utils";
import type { AppelerClaude } from "../scenario-claude";
import { demanderALAssistant } from "./assistant";

const SANS_GOOGLE = "http://127.0.0.1:9";
const AGENT = { provider: "anthropic", apiKey: "cle-de-test", model: "claude-test" } as ResolvedAgent;

/** Un faux Claude qui rend la réponse donnée, et garde ce qu'on lui a demandé. */
function fauxClaude(reponse: unknown) {
  const appels: { systeme: string; message: string }[] = [];
  const appeler: AppelerClaude = vi.fn(async (_agent, systeme, message) => {
    appels.push({ systeme, message });
    return { ok: true as const, texte: typeof reponse === "string" ? reponse : JSON.stringify(reponse) };
  });
  return { appeler, appels };
}

function preparer() {
  const film = filmDeTest(SANS_GOOGLE);
  film.creer(serieSaya());
  return { lieux: film.lieux, cinema: serieSaya() };
}

describe("demanderALAssistant", () => {
  it("une réplique pour un plan : le prénom devient l'id du casting", async () => {
    const { lieux, cinema } = preparer();
    const { appeler, appels } = fauxClaude({ personnage: "Awa", texte: "Ma grand-mère cueillait l'hibiscus à l'aube." });
    const reponse = await demanderALAssistant("saya", cinema, { type: "replique", episode: "ep1", plan: "rangement" }, lieux, AGENT, appeler);
    expect(reponse).toEqual({ ok: true, proposition: { type: "replique", plan: "rangement", replique: { personnage: "awa", texte: "Ma grand-mère cueillait l'hibiscus à l'aube." } } });
    // Claude voit l'épisode entier, le plan visé repéré, et la marque de la fiche.
    expect(appels[0].message).toContain("<== THIS SHOT");
    expect(appels[0].message).toContain("terrace overlooking the sea");
    expect(appels[0].message).toContain("Brand:");
  });

  it("demander une réplique EXIGE une réplique, et une autre que celle en place", async () => {
    const { lieux, cinema } = preparer();
    const { appeler, appels } = fauxClaude({ personnage: "Awa", texte: "Autre chose." });
    await demanderALAssistant("saya", cinema, { type: "replique", episode: "ep1", plan: "confidence" }, lieux, AGENT, appeler);
    // Recette du 15/10 : sans ces deux phrases, Haiku rendait une réplique vide, ou recopiait l'existante.
    expect(appels[0].message).toContain("you MUST write a non-empty line");
    expect(appels[0].message).toContain("never repeat the current wording");
  });

  it("refuse une réplique dite par quelqu'un qui n'est pas à l'image", async () => {
    const { lieux, cinema } = preparer();
    const { appeler } = fauxClaude({ personnage: "Awa", texte: "Bonjour." });
    // Le plan « flacon » ne montre personne.
    const reponse = await demanderALAssistant("saya", cinema, { type: "replique", episode: "ep1", plan: "flacon" }, lieux, AGENT, appeler);
    expect(reponse).toMatchObject({ ok: false, statut: 502 });
  });

  it("« Autre proposition » : Claude reçoit ce qu'on a écarté, pour ne pas le redonner", async () => {
    const { lieux, cinema } = preparer();
    const { appeler, appels } = fauxClaude({ personnage: "Awa", texte: "Une troisième." });
    const demande = { type: "replique", episode: "ep1", plan: "rangement", aEviter: ["Voilà. À sa place.", "Celle-ci aussi."] };
    await demanderALAssistant("saya", cinema, demande, lieux, AGENT, appeler);
    expect(appels[0].message).toContain("Already proposed and rejected");
    expect(appels[0].message).toContain("- Voilà. À sa place.");
  });

  it("refuse une réplique trop longue pour 8 s au lieu de la couper", async () => {
    const { lieux, cinema } = preparer();
    const { appeler } = fauxClaude({ personnage: "Awa", texte: "a".repeat(150) });
    const reponse = await demanderALAssistant("saya", cinema, { type: "replique", episode: "ep1", plan: "rangement" }, lieux, AGENT, appeler);
    expect(reponse).toMatchObject({ ok: false });
    if (!reponse.ok) expect(reponse.raison).toContain("150 caractères");
  });

  it("une consigne d'exemple est montrée VIDE à Claude, pas comme un texte à reprendre", async () => {
    const { lieux, cinema } = preparer();
    cinema.episodes[0].scenes[0].plans[1].consigne = EXEMPLES_DE_SERIE.consigne;
    const { appeler, appels } = fauxClaude({ consigne: "A slow sweep of golden light across the amber bottle." });
    const reponse = await demanderALAssistant("saya", cinema, { type: "consigne", episode: "ep1", plan: "flacon" }, lieux, AGENT, appeler);
    expect(reponse).toMatchObject({ ok: true, proposition: { type: "consigne", plan: "flacon" } });
    expect(appels[0].message).not.toContain(EXEMPLES_DE_SERIE.consigne);
    expect(appels[0].message).toContain("(empty: to be written)");
  });

  it("les dialogues d'une scène : un plan muet reste muet", async () => {
    const { lieux, cinema } = preparer();
    const { appeler } = fauxClaude({ repliques: [{ plan: 1, personnage: "Awa", texte: "Celui-ci, c'est le premier." }] });
    const reponse = await demanderALAssistant("saya", cinema, { type: "dialogues", episode: "ep1", scene: "boutique" }, lieux, AGENT, appeler);
    expect(reponse).toEqual({
      ok: true,
      proposition: { type: "dialogues", scene: "boutique", repliques: { rangement: { personnage: "awa", texte: "Celui-ci, c'est le premier." }, flacon: null } },
    });
  });

  it("le plan suivant : casting reconnu, prénoms inconnus écartés", async () => {
    const { lieux, cinema } = preparer();
    const { appeler } = fauxClaude({ consigne: "Awa turns off the lights and leaves.", personnages: ["Awa", "Inconnue"], objet: false, replique: null });
    const reponse = await demanderALAssistant("saya", cinema, { type: "plan-suivant", episode: "ep1", scene: "terrasse" }, lieux, AGENT, appeler);
    expect(reponse).toEqual({ ok: true, proposition: { type: "plan-suivant", scene: "terrasse", plan: { consigne: "Awa turns off the lights and leaves.", personnages: ["awa"], objet: false } } });
  });

  it("l'épisode suivant : Claude lit les épisodes déjà écrits, Awa garde son id", async () => {
    const { lieux, cinema } = preparer();
    const { appeler, appels } = fauxClaude({
      titre: "Le retour",
      objet: null,
      personnages: [{ nom: "Awa", description: "x" }],
      scenes: [{ decor: "A market at noon.", plans: [{ consigne: "Awa walks through the stalls.", personnages: ["Awa"], objet: false, replique: null }] }],
    });
    const reponse = await demanderALAssistant("saya", cinema, { type: "episode-suivant" }, lieux, AGENT, appeler);
    expect(appels[0].message).toContain("L'héritage");
    expect(reponse).toMatchObject({ ok: true, proposition: { type: "episode-suivant", nouveauxPersonnages: [] } });
    if (reponse.ok && reponse.proposition.type === "episode-suivant") expect(reponse.proposition.episode.scenes[0].plans[0].personnages).toEqual(["awa"]);
  });

  it("refuse une série invalide, une demande illisible, l'absence de clé, une réponse illisible", async () => {
    const { lieux, cinema } = preparer();
    const { appeler } = fauxClaude("pas du json");
    const demande = { type: "replique", episode: "ep1", plan: "rangement" };
    expect(await demanderALAssistant("saya", { personnages: "x" }, demande, lieux, AGENT, appeler)).toMatchObject({ ok: false, statut: 400 });
    expect(await demanderALAssistant("saya", cinema, { type: "inconnu" }, lieux, AGENT, appeler)).toMatchObject({ ok: false, statut: 400 });
    expect(await demanderALAssistant("saya", cinema, demande, lieux, null, appeler)).toMatchObject({ ok: false, statut: 412 });
    expect(await demanderALAssistant("saya", cinema, demande, lieux, AGENT, appeler)).toMatchObject({ ok: false, statut: 502 });
    expect(await demanderALAssistant("inconnu", cinema, demande, lieux, AGENT, appeler)).toMatchObject({ ok: false, statut: 404 });
  });
});
