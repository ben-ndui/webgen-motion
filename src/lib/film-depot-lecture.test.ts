import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { serieSaya } from "../../remotion/film/cinema/serie-exemple.test-utils";
import { modifierLaBible } from "./cinema/bible/stockage";
import { cheminDUnMediaAttendu } from "./film-depot-lecture";
import { filmDeTest } from "./cinema/film-de-test.test-utils";
import { ecrireAtomiquement } from "./film-fichiers-deposes";
import { videoMp4 } from "./cinema/veo-local.test-utils";

// Aucun Google ici : seule la lecture des fichiers du film est éprouvée.
function filmAvecSerie() {
  const film = filmDeTest("http://127.0.0.1:1/v1beta");
  const serie = film.donnerUnPortraitAAwa(serieSaya());
  serie.episodes[0].scenes[0].plans[1].fichier = "cinema/flacon.mp4";
  ecrireAtomiquement(join(film.lieux.public("saya"), "cinema", "flacon.mp4"), videoMp4());
  film.creer(serie);
  return film;
}

describe("cheminDUnMediaAttendu — fichiers de la série", () => {
  it("sert le portrait et la vidéo cités par la série et présents sur le disque", () => {
    const film = filmAvecSerie();
    expect(cheminDUnMediaAttendu("saya", "cinema/personnages/awa.jpg", film.lieux)).toBe(join(film.lieux.public("saya"), "cinema", "personnages", "awa.jpg"));
    expect(cheminDUnMediaAttendu("saya", "cinema/flacon.mp4", film.lieux)).toBe(join(film.lieux.public("saya"), "cinema", "flacon.mp4"));
  });

  it("refuse un fichier de cinema/ que la fiche ne cite pas, même présent", () => {
    const film = filmAvecSerie();
    ecrireAtomiquement(join(film.lieux.public("saya"), "cinema", "secret.mp4"), videoMp4());
    expect(cheminDUnMediaAttendu("saya", "cinema/secret.mp4", film.lieux)).toBeNull();
  });

  it("refuse un fichier cité mais absent du disque, et tout chemin qui sort du dossier", () => {
    const film = filmAvecSerie();
    expect(cheminDUnMediaAttendu("saya", "cinema/rangement.mp4", film.lieux)).toBeNull();
    expect(cheminDUnMediaAttendu("saya", "cinema/../../fiches/saya.json", film.lieux)).toBeNull();
  });

  it("sert une image de la bible visuelle, citée dans bible.json (pas dans la fiche elle-même)", () => {
    const film = filmAvecSerie();
    const fichier = "cinema/bible/awa/face-v1.jpg";
    modifierLaBible(film.lieux.dossier("saya"), (bible) => {
      bible.references.awa = { statut: "propose", vues: { face: { versions: [{ n: 1, fichier, origine: "generee", creeeLe: null }], retenue: 1 } }, journal: [] };
    });
    ecrireAtomiquement(join(film.lieux.public("saya"), "cinema", "bible", "awa", "face-v1.jpg"), videoMp4());
    expect(cheminDUnMediaAttendu("saya", fichier, film.lieux)).toBe(join(film.lieux.public("saya"), fichier));
  });

  it("refuse une image de la bible citée mais absente du disque", () => {
    const film = filmAvecSerie();
    const fichier = "cinema/bible/awa/face-v1.jpg";
    modifierLaBible(film.lieux.dossier("saya"), (bible) => {
      bible.references.awa = { statut: "propose", vues: { face: { versions: [{ n: 1, fichier, origine: "generee", creeeLe: null }], retenue: 1 } }, journal: [] };
    });
    expect(cheminDUnMediaAttendu("saya", fichier, film.lieux)).toBeNull();
  });
});
