import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { dossierJetable } from "../film-fixtures.test-utils";
import { OPERATION, type GoogleLocal, demarrerGoogleLocal, enCours, lancementAccepte, termine, videoMp4 } from "./veo-local.test-utils";
import { corpsDuLancement, lancerUnPlan, suivreUnPlan, telechargerLePlan } from "./veo";

let google: GoogleLocal;
beforeEach(async () => {
  google = await demarrerGoogleLocal();
});
afterEach(() => google.fermer());

const client = () => ({ base: google.base, cle: "cle-de-test" });
const demande = { qualite: "fast" as const, prompt: "A night garden.", negatif: "text" };

describe("lancerUnPlan", () => {
  it("envoie le prompt, le 9:16 1080p de 8 s et la clé en en-tête (jamais dans l'adresse)", async () => {
    google.repondre(lancementAccepte());
    expect(await lancerUnPlan(client(), demande)).toEqual({ ok: true, operation: OPERATION });
    const appel = google.appels[0];
    expect(appel.chemin).toBe("/v1beta/models/veo-3.1-fast-generate-preview:predictLongRunning");
    expect(appel.cle).toBe("cle-de-test");
    expect(appel.chemin).not.toContain("cle-de-test");
    expect(JSON.parse(appel.corps)).toEqual({
      instances: [{ prompt: "A night garden." }],
      parameters: { aspectRatio: "9:16", resolution: "1080p", durationSeconds: 8, negativePrompt: "text" },
    });
  });

  it("Lite : vise son modèle, et ses interdits passent dans le prompt (il refuse negativePrompt)", async () => {
    google.repondre(lancementAccepte());
    await lancerUnPlan(client(), { ...demande, qualite: "lite" });
    expect(google.appels[0].chemin).toContain("veo-3.1-lite-generate-preview");
    expect(JSON.parse(google.appels[0].corps)).toEqual({
      instances: [{ prompt: "A night garden. Avoid: text." }],
      parameters: { aspectRatio: "9:16", resolution: "1080p", durationSeconds: 8 },
    });
  });

  it("Fast : les portraits partent en référence « asset », encodés en base64, dans l'ordre", async () => {
    google.repondre(lancementAccepte());
    const portraits = [
      { octets: new Uint8Array([1, 2, 3]), mimeType: "image/jpeg" as const },
      { octets: new Uint8Array([4, 5]), mimeType: "image/png" as const },
    ];
    await lancerUnPlan(client(), { ...demande, references: portraits });
    const corps = JSON.parse(google.appels[0].corps);
    expect(corps.instances[0].referenceImages).toEqual([
      { image: { bytesBase64Encoded: "AQID", mimeType: "image/jpeg" }, referenceType: "asset" },
      { image: { bytesBase64Encoded: "BAU=", mimeType: "image/png" }, referenceType: "asset" },
    ]);
    // Fast + portrait refuse negativePrompt (recette réelle du 14/10) : interdits dans le prompt.
    expect(corps.parameters.negativePrompt).toBeUndefined();
    expect(corps.instances[0].prompt).toBe("A night garden. Avoid: text.");
  });

  it("Lite avec un portrait est refusé AVANT d'appeler Google (Google le refuserait)", () => {
    const portrait = { octets: new Uint8Array([1]), mimeType: "image/jpeg" as const };
    expect(() => corpsDuLancement({ ...demande, qualite: "lite", references: [portrait] })).toThrow("doit passer en Fast");
  });

  it("traduit les refus de Google en phrases qui disent quoi faire", async () => {
    google.repondre(
      { statut: 429, corps: { error: { message: "RESOURCE_EXHAUSTED" } } },
      { statut: 403, corps: {} },
      { statut: 400, corps: { error: { message: "`allow_adult` for personGeneration is currently not supported." } } },
      { statut: 200, corps: {} },
    );
    expect(await lancerUnPlan(client(), demande)).toMatchObject({ ok: false, statut: 429, raison: expect.stringContaining("Détail de Google : RESOURCE_EXHAUSTED") });
    expect(await lancerUnPlan(client(), demande)).toMatchObject({ ok: false, statut: 403, raison: expect.stringContaining("clé Gemini") });
    expect(await lancerUnPlan(client(), demande)).toMatchObject({ ok: false, raison: expect.stringContaining("allow_adult") });
    // Un 200 sans nom d'opération n'est PAS un lancement : rien à suivre.
    expect(await lancerUnPlan(client(), demande)).toMatchObject({ ok: false, statut: 200 });
  });

  it("dit que Google est injoignable quand le réseau tombe", async () => {
    expect(await lancerUnPlan({ base: "http://127.0.0.1:1/v1beta", cle: "x" }, demande)).toMatchObject({ ok: false, statut: 0 });
  });
});

describe("suivreUnPlan", () => {
  it("en cours, puis prêt avec l'adresse de la vidéo", async () => {
    google.repondre(enCours(), termine(google.base));
    expect(await suivreUnPlan(client(), OPERATION)).toEqual({ etat: "en-cours" });
    expect(await suivreUnPlan(client(), OPERATION)).toEqual({ etat: "pret", uri: `${google.base}/files/xyz:download?alt=media` });
    expect(google.appels[0].chemin).toBe(`/v1beta/${OPERATION}`);
  });

  it("refusé par le filtre de sécurité, ou arrêté par Google : la raison remonte", async () => {
    google.repondre(
      { statut: 200, corps: { done: true, response: { generateVideoResponse: { raiMediaFilteredReasons: ["Celebrity likeness."] } } } },
      { statut: 200, corps: { done: true, error: { message: "Internal error" } } },
      { statut: 200, corps: { done: true, response: {} } },
    );
    expect(await suivreUnPlan(client(), OPERATION)).toEqual({ etat: "refuse", raison: expect.stringContaining("Celebrity likeness.") });
    expect(await suivreUnPlan(client(), OPERATION)).toEqual({ etat: "refuse", raison: expect.stringContaining("Internal error") });
    expect(await suivreUnPlan(client(), OPERATION)).toEqual({ etat: "refuse", raison: expect.stringContaining("aucune vidéo rendue") });
  });

  it("une panne de Google n'est PAS un refus : l'opération n'est pas abandonnée", async () => {
    google.repondre({ statut: 503, corps: null });
    expect(await suivreUnPlan(client(), OPERATION)).toMatchObject({ etat: "injoignable" });
  });
});

describe("telechargerLePlan", () => {
  it("écrit la vraie vidéo, avec la clé envoyée au serveur de l'API", async () => {
    google.repondre({ statut: 200, video: true });
    const destination = join(dossierJetable("veo"), "cinema", "jardin.mp4");
    expect(await telechargerLePlan(client(), `${google.base}/files/xyz:download?alt=media`, destination)).toBe(true);
    expect(readFileSync(destination).equals(videoMp4())).toBe(true);
    expect(google.appels[0].cle).toBe("cle-de-test");
  });

  it("refuse une adresse hors du serveur de l'API : la clé ne part pas ailleurs", async () => {
    const destination = join(dossierJetable("veo"), "jardin.mp4");
    expect(await telechargerLePlan(client(), "https://exemple.invalid/video.mp4", destination)).toBe(false);
    expect(await telechargerLePlan(client(), "pas une adresse", destination)).toBe(false);
    expect(google.appels).toHaveLength(0);
  });

  it("refuse ce qui n'est pas une vidéo MP4 (page d'erreur servie en 200)", async () => {
    google.repondre({ statut: 200, corps: { error: "pas une vidéo" } });
    const destination = join(dossierJetable("veo"), "jardin.mp4");
    expect(await telechargerLePlan(client(), `${google.base}/files/xyz`, destination)).toBe(false);
    expect(existsSync(destination)).toBe(false);
  });
});
