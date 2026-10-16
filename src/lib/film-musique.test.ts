import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { dossierJetable } from "./film-fixtures.test-utils";
import { mesurerMusique } from "./film-musique";

// Un vrai fichier audio fabriqué par ffmpeg : un clic toutes les 60/120 s,
// pas un signal en mémoire. C'est la chaîne complète (décodage compris).
function metronomeEnFichier(tempo: number, secondes: number): string {
  const chemin = join(dossierJetable("musique"), `metronome-${tempo}.wav`);
  const periode = 60 / tempo;
  const expression = `if(lt(mod(t\\,${periode})\\,0.02)\\,0.9\\,0)`;
  const sortie = spawnSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", `aevalsrc=${expression}:s=8000:d=${secondes}`, chemin]);
  if (sortie.status !== 0) throw new Error(String(sortie.stderr));
  return chemin;
}

describe("mesure d'un morceau déposé", () => {
  it("retrouve le tempo d'un métronome enregistré", () => {
    const mesure = mesurerMusique(metronomeEnFichier(120, 40));
    expect(mesure.ok).toBe(true);
    if (mesure.ok) {
      expect(Math.abs(mesure.tempo - 120)).toBeLessThanOrEqual(0.2);
      expect(mesure.dureeSec).toBeCloseTo(40, 0);
    }
  });

  it("refuse un morceau trop court, et un fichier qui n'est pas de l'audio", () => {
    expect(mesurerMusique(metronomeEnFichier(120, 5))).toMatchObject({ ok: false, raison: expect.stringContaining("trop court") });
    expect(mesurerMusique(join(dossierJetable("musique"), "absent.mp3"))).toMatchObject({ ok: false });
  });

  it("accepte une musique dans un .mp4", () => {
    const wav = metronomeEnFichier(100, 30);
    const mp4 = wav.replace(/\.wav$/, ".mp4");
    const sortie = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", wav, "-c:a", "aac", mp4]);
    if (sortie.status !== 0) throw new Error(String(sortie.stderr));
    expect(mesurerMusique(mp4)).toMatchObject({ ok: true });
  });

  // La panne du 16/10 : l'app lancée depuis le Finder n'a pas Homebrew dans son PATH.
  it("se sert du ffmpeg fourni par l'app, même sans ffmpeg dans le PATH", () => {
    const fichier = metronomeEnFichier(120, 25);
    const ffmpegDuSysteme = spawnSync("which", ["ffmpeg"], { encoding: "utf-8" }).stdout.trim();
    const avant = { path: process.env.PATH, bin: process.env.WEBGEN_FFMPEG_BIN };
    try {
      process.env.PATH = "/usr/bin:/bin";
      process.env.WEBGEN_FFMPEG_BIN = ffmpegDuSysteme;
      expect(mesurerMusique(fichier)).toMatchObject({ ok: true });
      process.env.WEBGEN_FFMPEG_BIN = "/chemin/qui/n-existe/pas/ffmpeg";
      expect(mesurerMusique(fichier)).toMatchObject({ ok: false });
    } finally {
      process.env.PATH = avant.path;
      if (avant.bin === undefined) delete process.env.WEBGEN_FFMPEG_BIN;
      else process.env.WEBGEN_FFMPEG_BIN = avant.bin;
    }
  });
});

