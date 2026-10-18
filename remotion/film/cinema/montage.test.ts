import { describe, expect, it } from "vitest";

import { imageDeLaMesure } from "../lib/tempo";
import { FONDU_ENTRE_SCENES, FONDU_VERS_LE_LOGO, monterLEpisode, passagesGardes } from "./montage";
import { serieSaya } from "./serie-exemple.test-utils";
import type { CinemaDuFilm } from "./types";

const FPS = 30;
const TEMPO = 120;

// L'épisode SAYA avec ses trois vidéos posées.
function serieGeneree(): CinemaDuFilm {
  const serie = serieSaya();
  for (const plan of serie.episodes[0].scenes.flatMap((s) => s.plans)) plan.fichier = `cinema/${plan.id}.mp4`;
  return serie;
}

describe("passagesGardes", () => {
  it("sans découpe : les 8 s ; avec une coupe : deux passages autour", () => {
    const plan = serieSaya().episodes[0].scenes[0].plans[0];
    expect(passagesGardes(plan)).toEqual([[0, 8]]);
    plan.decoupe = { debut: 0, fin: 7.8, coupe: [4, 5] };
    expect(passagesGardes(plan)).toEqual([[0, 4], [5, 7.8]]);
  });
});

describe("monterLEpisode", () => {
  it("coupe franche dans une scène, fondu entre deux scènes, fondu vers le logo", () => {
    const montage = monterLEpisode(serieGeneree(), "ep1", TEMPO, FPS);
    expect(montage.morceaux.map(({ planId, debut, duree, fondu }) => ({ planId, debut, duree, fondu }))).toEqual([
      { planId: "rangement", debut: 0, duree: 240, fondu: 0 },
      { planId: "flacon", debut: 240, duree: 240, fondu: 0 },
      // Nouvelle scène : elle commence AVANT la fin de la précédente, le temps du fondu.
      { planId: "confidence", debut: 480 - FONDU_ENTRE_SCENES, duree: 240, fondu: FONDU_ENTRE_SCENES },
    ]);
    expect(montage.fin).toBe("logo-de-la-marque");
    expect(montage.debutDeLaFin).toBe(708 - FONDU_VERS_LE_LOGO);
    expect(montage.duree).toBe(708 - FONDU_VERS_LE_LOGO + imageDeLaMesure(2, TEMPO));
  });

  it("fin configurable : un carton de 3 s, ou rien après le dernier plan", () => {
    const carton = { ...serieGeneree(), fin: { type: "carton" as const, texte: "Studio Nébuleuse" } };
    expect(monterLEpisode(carton, "ep1", TEMPO, FPS)).toMatchObject({ fin: "carton", debutDeLaFin: 708 - FONDU_VERS_LE_LOGO, duree: 708 - FONDU_VERS_LE_LOGO + 90 });
    const sansFin = { ...serieGeneree(), fin: { type: "aucune" as const } };
    expect(monterLEpisode(sansFin, "ep1", TEMPO, FPS)).toMatchObject({ fin: "aucune", debutDeLaFin: 708, duree: 708 });
  });

  it("une découpe avec coupe donne deux morceaux bout à bout, chacun repris au bon endroit de la vidéo", () => {
    const serie = serieGeneree();
    serie.episodes[0].scenes[0].plans[0].decoupe = { debut: 0.5, fin: 7.8, coupe: [4, 5] };
    const [premier, second, suivant] = monterLEpisode(serie, "ep1", TEMPO, FPS).morceaux;
    expect(premier).toMatchObject({ planId: "rangement", debut: 0, duree: 105, depuis: 15 });
    expect(second).toMatchObject({ planId: "rangement", debut: 105, duree: 84, depuis: 150, fondu: 0 });
    expect(suivant).toMatchObject({ planId: "flacon", debut: 189 });
  });

  it("signale le plan qui parle (la musique se baissera) et l'objet imaginé (le rendu portera APERÇU)", () => {
    const montage = monterLEpisode(serieGeneree(), "ep1", TEMPO, FPS);
    expect(montage.morceaux.find((m) => m.planId === "confidence")?.replique).toBe(true);
    expect(montage.morceaux.find((m) => m.planId === "rangement")?.replique).toBe(false);
    expect(montage.objetImagine).toBe(true);
    const sansObjet = serieGeneree();
    for (const plan of sansObjet.episodes[0].scenes.flatMap((s) => s.plans)) plan.objet = false;
    expect(monterLEpisode(sansObjet, "ep1", TEMPO, FPS).objetImagine).toBe(false);
  });

  it("refuse un plan sans vidéo et un épisode inconnu, avec une phrase", () => {
    const serie = serieGeneree();
    delete serie.episodes[0].scenes[1].plans[0].fichier;
    expect(() => monterLEpisode(serie, "ep1", TEMPO, FPS)).toThrow("« confidence » n'a pas encore de vidéo");
    expect(() => monterLEpisode(serieGeneree(), "ep9", TEMPO, FPS)).toThrow("Épisode « ep9 » introuvable");
  });
});
