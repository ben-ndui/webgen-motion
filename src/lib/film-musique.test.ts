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
});
