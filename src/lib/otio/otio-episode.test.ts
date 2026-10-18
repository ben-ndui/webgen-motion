import { describe, expect, it } from "vitest";

import { FONDU_ENTRE_SCENES, monterLEpisode } from "../../../remotion/film/cinema/montage";
import { serieSaya } from "../../../remotion/film/cinema/serie-exemple.test-utils";
import type { OtioClip, OtioGap, OtioTrackChild } from "./elements";
import { type EntreeDeLEpisode, timelineDeLEpisode } from "./otio-episode";

const FPS = 30;
const TEMPO = 120;

function serieGeneree() {
  const cinema = serieSaya();
  for (const scene of cinema.episodes[0].scenes) {
    for (const plan of scene.plans) plan.fichier = `cinema/${plan.id}.mp4`;
  }
  return cinema;
}

function entree(modifs: Partial<EntreeDeLEpisode> = {}): EntreeDeLEpisode {
  return {
    nom: "L'héritage",
    fps: FPS,
    montage: monterLEpisode(serieGeneree(), "ep1", TEMPO, FPS),
    mediaDuPlan: (fichier) => ({ chemin: `/films/saya/public/${fichier}`, dureeSec: 8 }),
    musique: { chemin: "/films/saya/public/musique/theme.mp3", dureeSec: 180, premierTempsSec: 0.4, volume: 1 },
    rendu: { chemin: "/films/saya/out/Court-FR.episode-ep1.mp4", dureeSec: 30 },
    ...modifs,
  };
}

// Durée d'une piste dans le logiciel : les fondus ne l'allongent pas.
function dureeDeLaPiste(enfants: OtioTrackChild[]): number {
  return enfants
    .filter((e): e is OtioClip | OtioGap => e.OTIO_SCHEMA !== "Transition.1")
    .reduce((total, e) => total + e.source_range.duration.value, 0);
}

describe("timelineDeLEpisode", () => {
  it("dure exactement comme l'épisode rendu par GEN MOTION", () => {
    const e = entree();
    const [plans, son, musique] = timelineDeLEpisode(e).tracks.children;
    expect(dureeDeLaPiste(plans.children)).toBe(e.montage.duree);
    expect(dureeDeLaPiste(musique.children)).toBe(e.montage.duree);
    // Le son des plans s'arrête où le logo commence.
    expect(dureeDeLaPiste(son.children)).toBe(e.montage.debutDeLaFin);
  });

  it("chaque morceau garde sa découpe : il commence dans la vidéo là où GEN MOTION le fait partir", () => {
    const cinema = serieGeneree();
    cinema.episodes[0].scenes[0].plans[0].decoupe = { debut: 1.5, fin: 7 };
    const e = entree({ montage: monterLEpisode(cinema, "ep1", TEMPO, FPS) });
    const premier = timelineDeLEpisode(e).tracks.children[0].children[0] as OtioClip;
    expect(premier.source_range.start_time.value).toBe(45);
    expect(premier.media_references.DEFAULT_MEDIA.target_url).toBe("file:///films/saya/public/cinema/rangement.mp4");
  });

  it("le fondu entre deux scènes devient un fondu enchaîné, pris au-delà de la coupe", () => {
    const enfants = timelineDeLEpisode(entree()).tracks.children[0].children;
    const fondus = enfants.filter((e) => e.OTIO_SCHEMA === "Transition.1");
    // Deux scènes : un seul fondu. Dans une scène, coupe franche.
    expect(fondus).toHaveLength(1);
    expect(fondus[0]).toMatchObject({ in_offset: { value: 0 }, out_offset: { value: FONDU_ENTRE_SCENES } });
    // Le plan qui sort a encore ses images pendant le fondu : il est raccourci d'autant.
    const avant = enfants[enfants.indexOf(fondus[0]) - 1] as OtioClip;
    expect(avant.source_range.duration.value).toBe(8 * FPS - FONDU_ENTRE_SCENES);
  });

  it("le logo vient du rendu de l'épisode, à l'image où il commence", () => {
    const e = entree();
    const enfants = timelineDeLEpisode(e).tracks.children[0].children;
    const logo = enfants[enfants.length - 1] as OtioClip;
    expect(logo.media_references.DEFAULT_MEDIA.target_url).toBe("file:///films/saya/out/Court-FR.episode-ep1.mp4");
    expect(logo.source_range.start_time.value).toBe(e.montage.debutDeLaFin);
  });

  it("sans rendu, le logo est un emplacement repéré qui dit quoi faire", () => {
    const enfants = timelineDeLEpisode(entree({ rendu: null })).tracks.children[0].children;
    const logo = enfants[enfants.length - 1] as OtioGap;
    expect(logo.OTIO_SCHEMA).toBe("Gap.1");
    expect(logo.markers[0].name).toContain("rends l'épisode");
  });

  it("la musique part de son premier temps, avec un repère sur chaque réplique", () => {
    const e = entree();
    const musique = timelineDeLEpisode(e).tracks.children[2].children[0] as OtioClip;
    expect(musique.source_range.start_time.value).toBe(Math.round(0.4 * FPS));
    const repliques = musique.markers.filter((m) => m.name.includes("réplique"));
    // Un seul plan parle dans l'épisode.
    expect(repliques).toHaveLength(1);
    expect(repliques[0].marked_range.duration.value).toBeGreaterThan(0);
  });

  it("sans musique, pas de piste musique", () => {
    expect(timelineDeLEpisode(entree({ musique: null })).tracks.children.map((t) => t.name)).toEqual(["Plans", "Son des plans"]);
  });

  it("signale l'objet imaginé, que le rendu GEN MOTION marque « APERÇU »", () => {
    const premier = timelineDeLEpisode(entree()).tracks.children[0].children[0] as OtioClip;
    expect(premier.markers.map((m) => m.name).join()).toContain("APERÇU");
  });
});
