import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { serieSaya } from "../../../remotion/film/cinema/serie-exemple.test-utils";
import { ecrireAtomiquement } from "../film-fichiers-deposes";
import { filmDeTest } from "./film-de-test.test-utils";
import { plancheDuPlan } from "./planche-du-plan";
import { videoMp4 } from "./veo-local.test-utils";

// Aucun Google ici : seule la lecture des fichiers du film est éprouvée.
function film(avecVideo: boolean) {
  const f = filmDeTest("http://127.0.0.1:1/v1beta");
  const serie = serieSaya();
  serie.episodes[0].scenes[0].plans[1].fichier = "cinema/flacon.mp4";
  if (avecVideo) ecrireAtomiquement(join(f.lieux.public("saya"), "cinema", "flacon.mp4"), videoMp4());
  f.creer(serie);
  return f;
}

describe("plancheDuPlan", () => {
  it("fabrique la planche du plan généré, hors du dossier public", () => {
    const f = film(true);
    const resultat = plancheDuPlan("saya", "flacon", f.lieux);
    expect(resultat).toEqual({ ok: true, chemin: join(f.lieux.dossier("saya"), "planches", "flacon.png") });
    expect(existsSync(join(f.lieux.dossier("saya"), "planches", "flacon.png"))).toBe(true);
  });

  it("plan pas encore généré : 404 ; vidéo citée mais absente : 409 ; plan inconnu : 404", () => {
    const f = film(false);
    expect(plancheDuPlan("saya", "rangement", f.lieux)).toMatchObject({ ok: false, statut: 404, raison: "Ce plan n'est pas encore généré." });
    expect(plancheDuPlan("saya", "flacon", f.lieux)).toMatchObject({ ok: false, statut: 409 });
    expect(plancheDuPlan("saya", "fenetre", f.lieux)).toMatchObject({ ok: false, statut: 404 });
  });
});
