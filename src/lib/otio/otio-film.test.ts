import { describe, expect, it } from "vitest";

import type { OtioClip, OtioGap } from "./elements";
import { type EntreeDuFilm, timelineDuFilm } from "./otio-film";

const FPS = 30;

function entree(modifs: Partial<EntreeDuFilm> = {}): EntreeDuFilm {
  return {
    nom: "Film-FR",
    fps: FPS,
    duree: 300,
    plans: [
      { nom: "L'ouverture", debut: 0, duree: 60, glissement: false },
      { nom: "Le problème", debut: 60, duree: 120, glissement: false },
      { nom: "La bascule", debut: 180, duree: 120, glissement: true },
    ],
    rendu: { chemin: "/films/sd/out/Film-FR.mp4", dureeSec: 10 },
    repliques: [
      { chemin: "/films/sd/public/voix/fr/a.mp3", dureeSec: 2, texte: "Votre site existe.", debut: 30, fin: 90 },
      { chemin: "/films/sd/public/voix/fr/b.mp3", dureeSec: 1.5, texte: "Mais il ne performe pas.", debut: 94, fin: 139 },
    ],
    musique: { chemin: "/films/sd/public/musique/theme.mp3", dureeSec: 180, premierTempsSec: 0.2, volume: 0.8, sousLaVoix: 0.35, fondu: 60 },
    ...modifs,
  };
}

describe("timelineDuFilm", () => {
  it("découpe le rendu du film aux frontières des plans, chacun nommé", () => {
    const [plans] = timelineDuFilm(entree()).tracks.children;
    const clips = plans.children as OtioClip[];
    expect(clips.map((c) => c.name)).toEqual(["L'ouverture", "Le problème", "La bascule"]);
    expect(clips.map((c) => [c.source_range.start_time.value, c.source_range.duration.value])).toEqual([
      [0, 60],
      [60, 120],
      [180, 120],
    ]);
    expect(clips.every((c) => c.media_references.DEFAULT_MEDIA.target_url === "file:///films/sd/out/Film-FR.mp4")).toBe(true);
  });

  it("repère le plan qui entre par un glissement, dessiné dans le rendu", () => {
    const clips = timelineDuFilm(entree()).tracks.children[0].children as OtioClip[];
    expect(clips[2].markers[0].name).toContain("glissement");
    expect(clips[0].markers).toHaveLength(0);
  });

  it("pose chaque réplique de voix off à son image, avec du silence entre", () => {
    const voix = timelineDuFilm(entree()).tracks.children[1];
    expect(voix.name).toBe("Voix off");
    const [silence, a, souffle, b] = voix.children as (OtioClip | OtioGap)[];
    expect(silence.source_range.duration.value).toBe(30);
    expect(a.name).toBe("Votre site existe.");
    expect(a.source_range.duration.value).toBe(60);
    expect(souffle.source_range.duration.value).toBe(4);
    expect(b.source_range.duration.value).toBe(45);
  });

  it("la musique part de son premier temps et dure le film, repérée sous chaque voix et au fondu", () => {
    const musique = timelineDuFilm(entree()).tracks.children[2].children[0] as OtioClip;
    expect(musique.name).toBe("Musique (volume 80 %)");
    expect(musique.source_range.start_time.value).toBe(6);
    expect(musique.source_range.duration.value).toBe(300);
    expect(musique.markers.map((m) => m.name)).toEqual(["Musique à 35 % : voix off", "Musique à 35 % : voix off", "Fondu de sortie de la musique"]);
  });

  it("une réplique ne dépasse jamais son fichier mesuré (la fiche peut l'arrondir au-dessus)", () => {
    const repliques = [{ chemin: "/v/a.mp3", dureeSec: 1.5, texte: "Trop longue dans la fiche", debut: 30, fin: 90 }];
    const voix = timelineDuFilm(entree({ repliques })).tracks.children[1].children[1] as OtioClip;
    expect(voix.source_range.duration.value).toBe(45);
  });

  it("une réplique qui déborde du film est coupée à la fin du film, comme dans le rendu", () => {
    const repliques = [{ chemin: "/v/fin.mp3", dureeSec: 3, texte: "La dernière", debut: 270, fin: 360 }];
    const voix = timelineDuFilm(entree({ repliques })).tracks.children[1];
    const total = voix.children.reduce((somme, c) => somme + (c as OtioClip).source_range.duration.value, 0);
    expect(total).toBe(300);
  });

  it("sans voix off ni musique, il reste la piste des plans", () => {
    const timeline = timelineDuFilm(entree({ repliques: [], musique: null }));
    expect(timeline.tracks.children.map((t) => t.name)).toEqual(["Plans"]);
  });
});
