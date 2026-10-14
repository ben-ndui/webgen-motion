import { spawnSync } from "node:child_process";
import { existsSync, utimesSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { serieSaya } from "../../../remotion/film/cinema/serie-exemple.test-utils";
import { ecrireAtomiquement } from "../film-fichiers-deposes";
import { controlerLaReplique } from "./controle-replique";
import { filmDeTest } from "./film-de-test.test-utils";
import { nettoyerLaTranscription, transcrireAvecWhisper } from "./transcription";
import { videoMp4 } from "./veo-local.test-utils";

// Le film SAYA avec le plan « confidence » généré (une vraie vidéo, muette).
function film() {
  const f = filmDeTest("http://127.0.0.1:1/v1beta");
  const serie = serieSaya();
  serie.episodes[0].scenes[1].plans[0].fichier = "cinema/confidence.mp4";
  ecrireAtomiquement(join(f.lieux.public("saya"), "cinema", "confidence.mp4"), videoMp4());
  f.creer(serie);
  return f;
}
const ENTENDU_LE_14_10 = "Ce parfum, c'est l'histoire de ma grand-mère.";

describe("controlerLaReplique", () => {
  it("dite : ce qui a été entendu correspond à la réplique", async () => {
    const f = film();
    expect(await controlerLaReplique("saya", "confidence", f.lieux, () => ENTENDU_LE_14_10)).toEqual({ ok: true, controle: { statut: "dite", entendu: ENTENDU_LE_14_10 } });
  });

  it("écart : le personnage dit autre chose, ou rien (un plan prêt n'est pas un plan réussi)", async () => {
    const f = film();
    expect(await controlerLaReplique("saya", "confidence", f.lieux, () => "Bonsoir à tous.")).toMatchObject({ controle: { statut: "ecart" } });
    const autre = film();
    expect(await controlerLaReplique("saya", "confidence", autre.lieux, () => "")).toMatchObject({ controle: { statut: "ecart", entendu: "" } });
  });

  it("sans whisper sur la machine : « indisponible », jamais « dite », et rien n'est gardé", async () => {
    const f = film();
    expect(await controlerLaReplique("saya", "confidence", f.lieux, () => null)).toMatchObject({ controle: { statut: "indisponible" } });
    expect(existsSync(join(f.lieux.dossier("saya"), "controles", "confidence.json"))).toBe(false);
  });

  it("le résultat est gardé tant que la vidéo ne change pas ; un plan refait est réécouté", async () => {
    const f = film();
    const transcrire = vi.fn(() => ENTENDU_LE_14_10);
    await controlerLaReplique("saya", "confidence", f.lieux, transcrire);
    await controlerLaReplique("saya", "confidence", f.lieux, transcrire);
    expect(transcrire).toHaveBeenCalledTimes(1);
    const video = join(f.lieux.public("saya"), "cinema", "confidence.mp4");
    const plusTard = new Date(Date.now() + 60_000);
    utimesSync(video, plusTard, plusTard);
    await controlerLaReplique("saya", "confidence", f.lieux, transcrire);
    expect(transcrire).toHaveBeenCalledTimes(2);
  });

  it("plan sans réplique : 400 ; plan pas généré : 404", async () => {
    const f = film();
    expect(await controlerLaReplique("saya", "flacon", f.lieux, () => "")).toMatchObject({ ok: false, statut: 400 });
    expect(await controlerLaReplique("saya", "rangement", f.lieux, () => "")).toMatchObject({ ok: false, statut: 400 });
    const serie = serieSaya();
    const g = filmDeTest("http://127.0.0.1:1/v1beta");
    g.creer(serie);
    expect(await controlerLaReplique("saya", "confidence", g.lieux, () => "")).toMatchObject({ ok: false, statut: 404 });
  });
});

describe("transcription locale", () => {
  it("retire ce que whisper invente quand il n'entend personne", () => {
    expect(nettoyerLaTranscription(" [Musique] (rires) ♪ *applaudissements* ")).toBe("");
    expect(nettoyerLaTranscription("[Musique] Ce parfum, c'est l'histoire.")).toBe("Ce parfum, c'est l'histoire.");
  });

  // Un vrai passage par whisper, seulement si la machine l'a (sinon : rien à prouver ici).
  const whisperPresent = spawnSync("which", ["whisper-cli"]).status === 0 && existsSync(join(homedir(), ".whisper-models"));
  it.skipIf(!whisperPresent)("une vidéo muette donne « rien entendu », pas une phrase inventée", () => {
    const f = film();
    expect(transcrireAvecWhisper(join(f.lieux.public("saya"), "cinema", "confidence.mp4"))).toBe("");
  });
});
