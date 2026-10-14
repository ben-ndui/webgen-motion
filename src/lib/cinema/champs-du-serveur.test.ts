import { describe, expect, it } from "vitest";

import { serieSaya } from "../../../remotion/film/cinema/serie-exemple.test-utils";
import { garderLesChampsDuServeur } from "./champs-du-serveur";

// Ce qui est sur le disque : Awa a son portrait, le plan « flacon » sa vidéo payée.
function surLeDisque() {
  const cinema = serieSaya();
  cinema.personnages[0].portrait = "cinema/personnages/awa.jpg";
  cinema.episodes[0].scenes[0].plans[1].fichier = "cinema/flacon.mp4";
  return { cinema };
}

describe("garderLesChampsDuServeur", () => {
  it("une sauvegarde de l'écran SANS les champs serveur ne les efface pas (le plan payé reste)", () => {
    const envoyee = { cinema: serieSaya() };
    envoyee.cinema.episodes[0].titre = "Titre retouché";
    const gardee = garderLesChampsDuServeur(envoyee, surLeDisque()) as ReturnType<typeof surLeDisque>;
    expect(gardee.cinema.episodes[0].scenes[0].plans[1].fichier).toBe("cinema/flacon.mp4");
    expect(gardee.cinema.personnages[0].portrait).toBe("cinema/personnages/awa.jpg");
    expect(gardee.cinema.episodes[0].titre).toBe("Titre retouché");
  });

  it("le navigateur ne peut pas POSER une vidéo ou un portrait que le serveur n'a pas écrits", () => {
    const envoyee = { cinema: serieSaya() };
    envoyee.cinema.episodes[0].scenes[0].plans[0].fichier = "cinema/rangement.mp4";
    envoyee.cinema.personnages[0].portrait = "cinema/personnages/awa.png";
    const gardee = garderLesChampsDuServeur(envoyee, { cinema: serieSaya() }) as { cinema: ReturnType<typeof serieSaya> };
    expect(gardee.cinema.episodes[0].scenes[0].plans[0].fichier).toBeUndefined();
    expect(gardee.cinema.personnages[0].portrait).toBeUndefined();
  });

  it("un plan déplacé dans une autre scène garde sa vidéo (on suit l'id, pas la position)", () => {
    const envoyee = { cinema: serieSaya() };
    const flacon = envoyee.cinema.episodes[0].scenes[0].plans.splice(1, 1)[0];
    envoyee.cinema.episodes[0].scenes[1].plans.push(flacon);
    const gardee = garderLesChampsDuServeur(envoyee, surLeDisque()) as { cinema: ReturnType<typeof serieSaya> };
    expect(gardee.cinema.episodes[0].scenes[1].plans[1].fichier).toBe("cinema/flacon.mp4");
  });

  it("sans série, ou fiche illisible : rien n'est touché", () => {
    expect(garderLesChampsDuServeur({ exemple: true }, surLeDisque())).toEqual({ exemple: true });
    expect(garderLesChampsDuServeur(null, surLeDisque())).toBeNull();
    const envoyee = { cinema: serieSaya() };
    expect(garderLesChampsDuServeur(envoyee, null)).toBe(envoyee);
  });
});
