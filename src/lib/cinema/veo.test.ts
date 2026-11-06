import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { dossierJetable } from "../film-fixtures.test-utils";
import { type GoogleLocal, demarrerGoogleLocal, omniSansVideo, omniTermine, videoMp4 } from "./veo-local.test-utils";
import { corpsDuLancement, lancerUnPlan, suivreUnPlan, telechargerLePlan } from "./veo";

let google: GoogleLocal;
beforeEach(async () => {
  google = await demarrerGoogleLocal();
});
afterEach(() => google.fermer());

const client = () => ({ base: google.base, cle: "cle-de-test" });
const demande = { qualite: "fast" as const, prompt: "A night garden.", negatif: "text" };

describe("corpsDuLancement", () => {
  it("texte seul : le modèle Omni, le 9:16 en 720p, task text_to_video, les interdits dans le prompt", () => {
    expect(corpsDuLancement(demande)).toEqual({
      model: "gemini-omni-1.1-flash",
      input: [{ type: "text", text: "A night garden. Avoid: text." }],
      response_format: { type: "video", aspect_ratio: "9:16", resolution: "720p", delivery: "uri" },
      generation_config: { video_config: { task: "text_to_video" } },
    });
  });

  it("sans interdit à éviter : le prompt n'est pas modifié", () => {
    expect(corpsDuLancement({ ...demande, negatif: "" })).toMatchObject({ input: [{ type: "text", text: "A night garden." }] });
  });

  it("des portraits en référence : task reference_to_video, chaque image encodée en base64 à la suite du texte", () => {
    const portraits = [
      { octets: new Uint8Array([1, 2, 3]), mimeType: "image/jpeg" as const },
      { octets: new Uint8Array([4, 5]), mimeType: "image/png" as const },
    ];
    const corps = corpsDuLancement({ ...demande, references: portraits }) as { input: unknown[]; generation_config: { video_config: { task: string } } };
    expect(corps.input).toEqual([
      { type: "text", text: "A night garden. Avoid: text." },
      { type: "image", data: "AQID", mime_type: "image/jpeg" },
      { type: "image", data: "BAU=", mime_type: "image/png" },
    ]);
    expect(corps.generation_config.video_config.task).toBe("reference_to_video");
  });

  it("16:9 pour le décor sur mesure d'un format large", () => {
    const corps = corpsDuLancement({ ...demande, format: "16:9" }) as { response_format: { aspect_ratio: string } };
    expect(corps.response_format.aspect_ratio).toBe("16:9");
  });
});

describe("lancerUnPlan", () => {
  it("envoie le corps à /interactions, la clé en en-tête (jamais dans l'adresse), et rend l'adresse de la vidéo prête", async () => {
    google.repondre(omniTermine(google.base));
    const lancement = await lancerUnPlan(client(), demande);
    expect(lancement).toEqual({ ok: true, operation: `omni-pret:${google.base}/files/xyz:download?alt=media` });
    const appel = google.appels[0];
    expect(appel.chemin).toBe("/v1beta/interactions");
    expect(appel.cle).toBe("cle-de-test");
    expect(appel.chemin).not.toContain("cle-de-test");
  });

  it("une réponse « completed » sans vidéo exploitable : refus propre, rien à suivre", async () => {
    google.repondre(omniSansVideo());
    expect(await lancerUnPlan(client(), demande)).toMatchObject({ ok: false, statut: 502 });
  });

  it("traduit les refus de Google en phrases qui disent quoi faire", async () => {
    google.repondre(
      { statut: 429, corps: { error: { message: "RESOURCE_EXHAUSTED" } } },
      { statut: 403, corps: {} },
      { statut: 402, corps: {} },
      { statut: 400, corps: { error: { message: "`allow_adult` for personGeneration is currently not supported." } } },
    );
    expect(await lancerUnPlan(client(), demande)).toMatchObject({ ok: false, statut: 429, raison: expect.stringContaining("Détail de Google : RESOURCE_EXHAUSTED") });
    expect(await lancerUnPlan(client(), demande)).toMatchObject({ ok: false, statut: 403, raison: expect.stringContaining("clé Gemini") });
    expect(await lancerUnPlan(client(), demande)).toMatchObject({ ok: false, statut: 402, raison: expect.stringContaining("Plus de crédit") });
    expect(await lancerUnPlan(client(), demande)).toMatchObject({ ok: false, raison: expect.stringContaining("allow_adult") });
  });

  it("dit que Google est injoignable quand le réseau tombe", async () => {
    expect(await lancerUnPlan({ base: "http://127.0.0.1:1/v1beta", cle: "x" }, demande)).toMatchObject({ ok: false, statut: 0 });
  });
});

describe("suivreUnPlan", () => {
  it("une opération du pont est déjà prête : aucun appel à Google", async () => {
    const uri = `${google.base}/files/xyz:download?alt=media`;
    expect(await suivreUnPlan(client(), `omni-pret:${uri}`)).toEqual({ etat: "pret", uri });
    expect(google.appels).toHaveLength(0);
  });

  it("une opération d'un ancien format (Veo) : refusée proprement, à relancer", async () => {
    expect(await suivreUnPlan(client(), "models/veo-3.1-fast-generate-preview/operations/ab12cd34")).toMatchObject({ etat: "refuse" });
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
