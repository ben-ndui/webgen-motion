import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

import { serieSaya } from "../../../remotion/film/cinema/serie-exemple.test-utils";
import type { OtioClip, OtioTimeline } from "../otio/elements";
import { exporterLEpisodeEnOtio } from "./export-otio-episode";
import { filmDeTest } from "./film-de-test.test-utils";

// Un faux Google n'est pas appelé ici : l'export ne génère rien.
const SANS_GOOGLE = "http://127.0.0.1:9";
// Les vidéos de test sont des fichiers factices : on leur donne 8 s.
const sonde = () => 8;

function ecrire(chemin: string, contenu = "x"): void {
  mkdirSync(dirname(chemin), { recursive: true });
  writeFileSync(chemin, contenu);
}

/** Un film « saya » dont les trois plans sont générés (vidéos sur le disque). */
function filmGenere(avecMusique = true) {
  const film = filmDeTest(SANS_GOOGLE);
  const cinema = serieSaya();
  for (const scene of cinema.episodes[0].scenes) {
    for (const plan of scene.plans) {
      plan.fichier = `cinema/${plan.id}.mp4`;
      ecrire(join(film.lieux.public("saya"), plan.fichier));
    }
  }
  film.creer(cinema);
  if (avecMusique) ecrire(join(film.lieux.public("saya"), film.fiche().musique.fichier));
  const declinaison = film.fiche().declinaisons[0].nom;
  return { film, declinaison };
}

describe("exporterLEpisodeEnOtio", () => {
  it("écrit la timeline dans out/ et la rend lisible", () => {
    const { film, declinaison } = filmGenere();
    const resultat = exporterLEpisodeEnOtio("saya", declinaison, "ep1", film.lieux, sonde);
    expect(resultat.ok).toBe(true);
    if (!resultat.ok) return;
    expect(resultat.chemin).toBe(join(film.lieux.dossier("saya"), "out", `${declinaison}.episode-ep1.otio`));
    const timeline = JSON.parse(readFileSync(resultat.chemin, "utf-8")) as OtioTimeline;
    expect(timeline.tracks.children.map((t) => t.name)).toEqual(["Plans", "Son des plans", "Musique"]);
    const premier = timeline.tracks.children[0].children[0] as OtioClip;
    expect(premier.media_references.DEFAULT_MEDIA.target_url).toContain("/cinema/rangement.mp4");
  });

  it("sans rendu de l'épisode, le logo est un emplacement repéré et l'export le dit", () => {
    const { film, declinaison } = filmGenere();
    const resultat = exporterLEpisodeEnOtio("saya", declinaison, "ep1", film.lieux, sonde);
    expect(resultat).toMatchObject({ ok: true, logoInclus: false });
  });

  it("avec le rendu de l'épisode, le logo vient du rendu", () => {
    const { film, declinaison } = filmGenere();
    ecrire(join(film.lieux.dossier("saya"), "out", `${declinaison}.episode-ep1.mp4`));
    expect(exporterLEpisodeEnOtio("saya", declinaison, "ep1", film.lieux, sonde)).toMatchObject({ ok: true, logoInclus: true });
  });

  it("sans musique sur le disque, la timeline n'a pas de piste musique (mais existe)", () => {
    const { film, declinaison } = filmGenere(false);
    const resultat = exporterLEpisodeEnOtio("saya", declinaison, "ep1", film.lieux, sonde);
    if (!resultat.ok) throw new Error(resultat.raison);
    const timeline = JSON.parse(readFileSync(resultat.chemin, "utf-8")) as OtioTimeline;
    expect(timeline.tracks.children.map((t) => t.name)).toEqual(["Plans", "Son des plans"]);
  });

  it("refuse un épisode dont un plan n'est pas généré, en nommant le plan", () => {
    const film = filmDeTest(SANS_GOOGLE);
    film.creer(serieSaya());
    const resultat = exporterLEpisodeEnOtio("saya", film.fiche().declinaisons[0].nom, "ep1", film.lieux, sonde);
    expect(resultat).toMatchObject({ ok: false, statut: 409 });
    if (!resultat.ok) expect(resultat.raison).toContain("rangement");
  });

  it("refuse si la vidéo d'un plan a disparu du disque : le monteur ouvrirait un média hors ligne", () => {
    const film = filmDeTest(SANS_GOOGLE);
    const cinema = serieSaya();
    for (const scene of cinema.episodes[0].scenes) for (const plan of scene.plans) plan.fichier = `cinema/${plan.id}.mp4`;
    film.creer(cinema);
    const resultat = exporterLEpisodeEnOtio("saya", film.fiche().declinaisons[0].nom, "ep1", film.lieux, sonde);
    expect(resultat).toMatchObject({ ok: false, statut: 409 });
    if (!resultat.ok) expect(resultat.raison).toContain("manque sur le disque");
  });

  it("une déclinaison ou un épisode inconnus répondent 404, sans rien écrire", () => {
    const { film, declinaison } = filmGenere();
    expect(exporterLEpisodeEnOtio("saya", "Inconnue", "ep1", film.lieux, sonde)).toMatchObject({ ok: false, statut: 404 });
    expect(exporterLEpisodeEnOtio("saya", declinaison, "ep9", film.lieux, sonde)).toMatchObject({ ok: false, statut: 404 });
    expect(exporterLEpisodeEnOtio("inconnu", declinaison, "ep1", film.lieux, sonde)).toMatchObject({ ok: false, statut: 404 });
  });
});
