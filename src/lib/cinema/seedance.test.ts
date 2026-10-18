import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { dossierJetable } from "../film-fixtures.test-utils";
import { type Appel, type FalLocal, REQUEST_ID, demarrerFalLocal, enCours, enFile, soumissionAcceptee, termine } from "./seedance-local.test-utils";
import { corpsDuLancement, lancerUnPlan, suivreUnPlan, telechargerLePlan } from "./seedance";
import { videoMp4 } from "./veo-local.test-utils";

let fal: FalLocal;
beforeEach(async () => {
  fal = await demarrerFalLocal();
});
afterEach(() => fal.fermer());

const client = () => ({ base: fal.base, cle: "cle-de-test", domainesMedia: ["127.0.0.1"] });
const demande = { prompt: "A night garden." };

describe("lancerUnPlan", () => {
  it("envoie le prompt, le 9:16 1080p de 8 s, et la clé dans l'en-tête Authorization", async () => {
    fal.repondre(soumissionAcceptee());
    expect(await lancerUnPlan(client(), demande)).toEqual({ ok: true, operation: REQUEST_ID });
    const appel: Appel = fal.appels[0];
    expect(appel.chemin).toBe("/bytedance/seedance-2.5/us/reference-to-video");
    expect(appel.autorisation).toBe("Key cle-de-test");
    expect(JSON.parse(appel.corps)).toEqual({ prompt: "A night garden.", resolution: "1080p", duration: "8", aspect_ratio: "9:16" });
  });

  it("les références partent en data URI, dans l'ordre", async () => {
    fal.repondre(soumissionAcceptee());
    const references = [
      { octets: new Uint8Array([1, 2, 3]), mimeType: "image/jpeg" as const },
      { octets: new Uint8Array([4, 5]), mimeType: "image/png" as const },
    ];
    await lancerUnPlan(client(), { ...demande, references });
    const corps = JSON.parse(fal.appels[0].corps);
    expect(corps.image_urls).toEqual(["data:image/jpeg;base64,AQID", "data:image/png;base64,BAU="]);
  });

  it("sans référence, pas de champ image_urls (Seedance l'exige parfois absent plutôt que vide)", () => {
    expect(corpsDuLancement(demande)).not.toHaveProperty("image_urls");
  });

  it("les interdits partent dans le prompt : Seedance n'a pas de negative_prompt", () => {
    const corps = corpsDuLancement({ ...demande, negatif: "text, logos" }) as { prompt: string };
    expect(corps.prompt).toBe("A night garden. Avoid: text, logos.");
    expect(corps).not.toHaveProperty("negative_prompt");
  });

  it("traduit les refus de fal.ai en phrases qui disent quoi faire", async () => {
    fal.repondre(
      { statut: 401, corps: {} },
      { statut: 429, corps: { detail: "exhausted" } },
      { statut: 422, corps: { detail: [{ msg: "prompt is required" }] } },
      { statut: 200, corps: {} },
    );
    expect(await lancerUnPlan(client(), demande)).toMatchObject({ ok: false, statut: 401, raison: expect.stringContaining("refuse la clé") });
    expect(await lancerUnPlan(client(), demande)).toMatchObject({ ok: false, statut: 429, raison: expect.stringContaining("Détail : exhausted") });
    expect(await lancerUnPlan(client(), demande)).toMatchObject({ ok: false, raison: expect.stringContaining("prompt is required") });
    // Un 200 sans request_id n'est PAS un lancement : rien à suivre.
    expect(await lancerUnPlan(client(), demande)).toMatchObject({ ok: false, statut: 200 });
  });

  it("dit que fal.ai est injoignable quand le réseau tombe", async () => {
    expect(await lancerUnPlan({ base: "http://127.0.0.1:1", cle: "x", domainesMedia: [] }, demande)).toMatchObject({ ok: false, statut: 0 });
  });
});

describe("suivreUnPlan", () => {
  it("en file, en cours, puis prêt avec l'adresse de la vidéo", async () => {
    fal.repondre(enFile());
    expect(await suivreUnPlan(client(), REQUEST_ID)).toEqual({ etat: "en-cours" });
    fal.repondre(enCours());
    expect(await suivreUnPlan(client(), REQUEST_ID)).toEqual({ etat: "en-cours" });
    fal.repondre(...termine(fal.base));
    expect(await suivreUnPlan(client(), REQUEST_ID)).toEqual({ etat: "pret", uri: `${fal.base}/files/plan.mp4` });
    expect(fal.appels[0].chemin).toBe(`/bytedance/seedance-2.5/us/reference-to-video/requests/${REQUEST_ID}/status`);
  });

  it("une file terminée sans vidéo dans le résultat est un refus", async () => {
    fal.repondre({ statut: 200, corps: { status: "COMPLETED" } }, { statut: 200, corps: {} });
    expect(await suivreUnPlan(client(), REQUEST_ID)).toMatchObject({ etat: "refuse" });
  });

  it("un statut inattendu est un refus", async () => {
    fal.repondre({ statut: 200, corps: { status: "FAILED" } });
    expect(await suivreUnPlan(client(), REQUEST_ID)).toEqual({ etat: "refuse", raison: expect.stringContaining("FAILED") });
  });

  it("une panne de fal.ai n'est PAS un refus : l'opération n'est pas abandonnée", async () => {
    fal.repondre({ statut: 503, corps: null });
    expect(await suivreUnPlan(client(), REQUEST_ID)).toMatchObject({ etat: "injoignable" });
  });

  it("COMPLETED avec un champ error est un vrai refus", async () => {
    fal.repondre({ statut: 200, corps: { status: "COMPLETED", error: "Content policy violation" } });
    expect(await suivreUnPlan(client(), REQUEST_ID)).toEqual({ etat: "refuse", raison: expect.stringContaining("Content policy violation") });
  });

  it("une panne PASSAGÈRE sur /response (plan déjà payé et terminé) n'est PAS un refus : l'opération n'est pas abandonnée", async () => {
    fal.repondre({ statut: 200, corps: { status: "COMPLETED" } }, { statut: 502, corps: null });
    expect(await suivreUnPlan(client(), REQUEST_ID)).toMatchObject({ etat: "injoignable" });
  });

  it("un VRAI refus sur /response (422) est bien un refus", async () => {
    fal.repondre({ statut: 200, corps: { status: "COMPLETED" } }, { statut: 422, corps: { detail: "invalid request" } });
    expect(await suivreUnPlan(client(), REQUEST_ID)).toEqual({ etat: "refuse", raison: expect.stringContaining("invalid request") });
  });
});

describe("telechargerLePlan", () => {
  it("écrit la vraie vidéo depuis un domaine de confiance", async () => {
    fal.repondre({ statut: 200, video: true });
    const destination = join(dossierJetable("seedance"), "cinema", "jardin.mp4");
    expect(await telechargerLePlan(client(), `${fal.base}/files/plan.mp4`, destination)).toBe(true);
    expect(readFileSync(destination).equals(videoMp4())).toBe(true);
  });

  it("refuse une adresse hors des domaines de confiance", async () => {
    const destination = join(dossierJetable("seedance"), "jardin.mp4");
    expect(await telechargerLePlan(client(), "https://exemple.invalid/video.mp4", destination)).toBe(false);
    expect(await telechargerLePlan(client(), "pas une adresse", destination)).toBe(false);
    expect(fal.appels).toHaveLength(0);
  });

  it("refuse ce qui n'est pas une vidéo MP4", async () => {
    fal.repondre({ statut: 200, corps: { error: "pas une vidéo" } });
    const destination = join(dossierJetable("seedance"), "jardin.mp4");
    expect(await telechargerLePlan(client(), `${fal.base}/files/plan.mp4`, destination)).toBe(false);
    expect(existsSync(destination)).toBe(false);
  });
});
