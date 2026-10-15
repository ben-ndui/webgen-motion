import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

import type { FilmSpec } from "../../remotion/film/spec";
import { creerFilm } from "./film-ecriture";
import { exporterLeFilmEnOtio } from "./film-export-otio";
import { dossierJetable, ficheValide } from "./film-fixtures.test-utils";
import type { OtioClip, OtioTimeline } from "./otio/elements";

const sonde = () => 10;

function ecrire(chemin: string): void {
  mkdirSync(dirname(chemin), { recursive: true });
  writeFileSync(chemin, "x");
}

/** Un film jetable, avec une réplique de voix off générée et, au choix, son rendu. */
function film({ rendu = true, voixSurLeDisque = true, musique = true } = {}) {
  const racine = dossierJetable("otio-film");
  const lieux = {
    fiches: join(racine, "fiches"),
    dossier: (id: string) => join(racine, "films", id),
    public: (id: string) => join(racine, "films", id, "public"),
  };
  const spec: FilmSpec = ficheValide();
  spec.voix = { musiqueSousLaVoix: 0.3, lignes: { fr: [{ repere: "ouverture.nom", texte: "Smooth and Design.", fichier: "voix/fr/nom.mp3", duree: 1.2 }], en: [] } };
  creerFilm("sd", spec, lieux.fiches);
  const declinaison = spec.declinaisons.find((d) => d.langue === "fr")!;
  if (rendu) ecrire(join(lieux.dossier("sd"), "out", `${declinaison.nom}.mp4`));
  if (voixSurLeDisque) ecrire(join(lieux.public("sd"), "voix/fr/nom.mp3"));
  if (musique) ecrire(join(lieux.public("sd"), spec.musique.fichier));
  return { lieux, declinaison };
}

describe("exporterLeFilmEnOtio", () => {
  it("écrit out/<déclinaison>.otio : les plans découpés dans le rendu, la voix off et la musique", () => {
    const { lieux, declinaison } = film();
    const resultat = exporterLeFilmEnOtio("sd", declinaison.nom, lieux, sonde);
    if (!resultat.ok) throw new Error(resultat.raison);
    expect(resultat.chemin).toBe(join(lieux.dossier("sd"), "out", `${declinaison.nom}.otio`));
    const timeline = JSON.parse(readFileSync(resultat.chemin, "utf-8")) as OtioTimeline;
    expect(timeline.tracks.children.map((t) => t.name)).toEqual(["Plans", "Voix off", "Musique"]);
    const plans = timeline.tracks.children[0].children as OtioClip[];
    expect(plans[0].name).toBe("L'ouverture");
    expect(plans.every((p) => p.media_references.DEFAULT_MEDIA.target_url.endsWith(`/out/${declinaison.nom}.mp4`))).toBe(true);
    const voix = timeline.tracks.children[1].children.find((c) => c.OTIO_SCHEMA === "Clip.2") as OtioClip;
    expect(voix.name).toBe("Smooth and Design.");
  });

  it("refuse tant que le film n'est pas rendu : sa piste image découpe le rendu", () => {
    const { lieux, declinaison } = film({ rendu: false });
    const resultat = exporterLeFilmEnOtio("sd", declinaison.nom, lieux, sonde);
    expect(resultat).toMatchObject({ ok: false, statut: 409 });
    if (!resultat.ok) expect(resultat.raison).toContain("Rends d'abord");
  });

  it("refuse si une voix a disparu du disque, en nommant son repère", () => {
    const { lieux, declinaison } = film({ voixSurLeDisque: false });
    const resultat = exporterLeFilmEnOtio("sd", declinaison.nom, lieux, sonde);
    expect(resultat).toMatchObject({ ok: false, statut: 409 });
    if (!resultat.ok) expect(resultat.raison).toContain("ouverture.nom");
  });

  it("sans musique sur le disque, la timeline existe sans piste musique", () => {
    const { lieux, declinaison } = film({ musique: false });
    const resultat = exporterLeFilmEnOtio("sd", declinaison.nom, lieux, sonde);
    if (!resultat.ok) throw new Error(resultat.raison);
    const timeline = JSON.parse(readFileSync(resultat.chemin, "utf-8")) as OtioTimeline;
    expect(timeline.tracks.children.map((t) => t.name)).toEqual(["Plans", "Voix off"]);
  });

  it("un film ou une déclinaison inconnus répondent 404", () => {
    const { lieux, declinaison } = film();
    expect(exporterLeFilmEnOtio("inconnu", declinaison.nom, lieux, sonde)).toMatchObject({ ok: false, statut: 404 });
    expect(exporterLeFilmEnOtio("sd", "Inconnue", lieux, sonde)).toMatchObject({ ok: false, statut: 404 });
  });
});
