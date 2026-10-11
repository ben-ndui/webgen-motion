import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { dossierJetable } from "../film-fixtures.test-utils";

import { ficheDeDepart } from "../film-fiche-depart";
import { citerLaVideo, nomDeLaVideo, poserLesVideos } from "./videos-du-film";

describe("vidéos dans la fiche", () => {
  it("nomme la vidéo comme son image", () => {
    expect(nomDeLaVideo("parcours-2.png")).toBe("parcours-2.mp4");
  });

  it("fait citer la vidéo partout où l'image l'était : parcours ET éventail", () => {
    const fiche = ficheDeDepart({ nom: "Saya", langues: ["fr"], formats: ["court"], direction: "nocturne" });
    citerLaVideo(fiche, "parcours-2.png");
    citerLaVideo(fiche, "site.png");
    expect(fiche.ecrans.parcours).toEqual(["parcours-1.png", "parcours-2.mp4", "parcours-3.png", "parcours-4.png"]);
    expect(fiche.bibliotheque?.eventail[1]).toBe("parcours-2.mp4");
    expect(fiche.bibliotheque?.ecranDeLAdresse).toBe("site.mp4");
  });
});

describe("poser les vidéos sans écraser ce que la personne a déposé", () => {
  function decor() {
    const racine = dossierJetable("videos");
    const publicDir = join(racine, "public");
    mkdirSync(join(publicDir, "ecrans-fr"), { recursive: true });
    writeFileSync(join(publicDir, "ecrans-fr/parcours-1.png"), "image deposee a la main");
    writeFileSync(join(publicDir, "ecrans-fr/parcours-2.png"), "image posee par genmotion");
    const video = join(racine, "tournage.mp4");
    writeFileSync(video, "video");
    const fiche = ficheDeDepart({ nom: "Saya", langues: ["fr"], formats: ["court"], direction: "nocturne" });
    const videos = new Map([["parcours-1.png", video], ["parcours-2.png", video], ["parcours-3.png", video]]);
    return { publicDir, fiche, videos, propositions: { "capture:ecrans-fr/parcours-2.png": "ecrans-fr/parcours-2.png" } };
  }

  it("garde l'image déposée à la main, remplace celle de GEN MOTION, remplit la case vide", () => {
    const { publicDir, fiche, videos, propositions } = decor();
    const { posees, gardees } = poserLesVideos(fiche, videos, ["fr"], publicDir, propositions);
    expect(gardees).toBe(1);
    expect(posees).toEqual(["ecrans-fr/parcours-2.mp4", "ecrans-fr/parcours-3.mp4"]);
    expect(fiche.ecrans.parcours.slice(0, 3)).toEqual(["parcours-1.png", "parcours-2.mp4", "parcours-3.mp4"]);
    expect(existsSync(join(publicDir, "ecrans-fr/parcours-1.mp4"))).toBe(false);
  });

  it("avec l'accord explicite, remplace aussi l'image déposée à la main", () => {
    const { publicDir, fiche, videos, propositions } = decor();
    poserLesVideos(fiche, videos, ["fr"], publicDir, propositions, true);
    expect(fiche.ecrans.parcours[0]).toBe("parcours-1.mp4");
  });
});
