import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { deposerCapture, deposerLogo, deposerMusique, deposerMusiqueDeLaBibliotheque } from "./film-depot";
import { writeFileSync } from "node:fs";
import { creerFilm, lireFicheBrute } from "./film-ecriture";
import { ficheDeDepart } from "./film-fiche-depart";
import { dossierJetable } from "./film-fixtures.test-utils";

const PNG_2x1 = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 200, 0, 0, 0, 100, 8, 6, 0, 0, 0,
]);
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 16]);
const SVG = new TextEncoder().encode('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 100"></svg>');

function nouveauFilm() {
  const racine = dossierJetable("depot");
  const lieux = { fiches: join(racine, "fiches"), public: (id: string) => join(racine, "medias", id, "public") };
  creerFilm("saya", ficheDeDepart({ nom: "Saya", langues: ["fr"], formats: ["court"], direction: "nocturne" }), lieux.fiches);
  return lieux;
}

function metronome(secondes: number): Uint8Array {
  const chemin = join(dossierJetable("musique"), "clic.wav");
  const expression = "if(lt(mod(t\\,0.5)\\,0.02)\\,0.9\\,0)";
  spawnSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", `aevalsrc=${expression}:s=8000:d=${secondes}`, chemin]);
  return readFileSync(chemin);
}

describe("dépôt d'une capture", () => {
  it("range l'image dans la case attendue, quel que soit le nom du fichier d'origine", () => {
    const lieux = nouveauFilm();
    expect(deposerCapture("saya", "ecrans-fr/parcours-1.png", JPEG, lieux)).toEqual({ ok: true });
    expect(readFileSync(join(lieux.public("saya"), "ecrans-fr/parcours-1.png"))).toEqual(Buffer.from(JPEG));
  });

  it("refuse une case inconnue, un chemin qui sort du dossier, un fichier qui n'est pas une image", () => {
    const lieux = nouveauFilm();
    expect(deposerCapture("saya", "ecrans-fr/autre.png", PNG_2x1, lieux)).toMatchObject({ ok: false, statut: 400 });
    expect(deposerCapture("saya", "../../evade.png", PNG_2x1, lieux)).toMatchObject({ ok: false, statut: 400 });
    expect(deposerCapture("saya", "ecrans-en/parcours-1.png", PNG_2x1, lieux)).toMatchObject({ ok: false });
    expect(deposerCapture("saya", "ecrans-fr/parcours-1.png", new TextEncoder().encode("bonjour"), lieux)).toMatchObject({ ok: false, statut: 400 });
    expect(deposerCapture("saya", "ecrans-fr/parcours-1.png", new Uint8Array(0), lieux)).toMatchObject({ ok: false, raison: "Le fichier est vide" });
    expect(deposerCapture("absent", "ecrans-fr/parcours-1.png", PNG_2x1, lieux)).toMatchObject({ ok: false, statut: 404 });
  });
});

describe("dépôt d'une vidéo d'écran", () => {
  function videoDEcran(): Uint8Array {
    const chemin = join(dossierJetable("video"), "ecran.mov");
    spawnSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "testsrc=size=1170x2532:rate=30:duration=3", "-pix_fmt", "yuv420p", chemin]);
    return readFileSync(chemin);
  }

  it("la met au format du film, renomme la case en .mp4 et la fait citer par la fiche", () => {
    const lieux = nouveauFilm();
    expect(deposerCapture("saya", "ecrans-fr/parcours-2.png", videoDEcran(), lieux)).toEqual({ ok: true });
    const sortie = join(lieux.public("saya"), "ecrans-fr/parcours-2.mp4");
    const sonde = spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name,width,codec_type", "-of", "compact", sortie], { encoding: "utf-8" }).stdout;
    expect(sonde).toContain("codec_name=h264");
    expect(sonde).toContain("width=1080");
    expect(sonde).not.toContain("codec_type=audio");
    const fiche = lireFicheBrute("saya", lieux.fiches) as { ecrans: { parcours: string[] }; bibliotheque: { eventail: string[] } };
    expect(fiche.ecrans.parcours[1]).toBe("parcours-2.mp4");
    expect(fiche.bibliotheque.eventail[1]).toBe("parcours-2.mp4");
  });

  it("une image redéposée dans une case vidéo la repasse en .png", () => {
    const lieux = nouveauFilm();
    deposerCapture("saya", "ecrans-fr/parcours-2.png", videoDEcran(), lieux);
    expect(deposerCapture("saya", "ecrans-fr/parcours-2.mp4", PNG_2x1, lieux)).toEqual({ ok: true });
    const fiche = lireFicheBrute("saya", lieux.fiches) as { ecrans: { parcours: string[] } };
    expect(fiche.ecrans.parcours[1]).toBe("parcours-2.png");
  });
});

describe("dépôt de la musique", () => {
  it("mesure le morceau et le fait citer par la fiche", () => {
    const lieux = nouveauFilm();
    expect(deposerMusique("saya", "Mon Morceau (Remix).wav", metronome(40), lieux)).toEqual({ ok: true });
    const fiche = lireFicheBrute("saya", lieux.fiches) as { musique: Record<string, unknown> };
    expect(fiche.musique).toMatchObject({ fichier: "musique/mon-morceau-remix.wav", titre: "Mon Morceau (Remix)" });
    expect(Math.abs((fiche.musique.tempo as number) - 120)).toBeLessThanOrEqual(0.2);
    expect(existsSync(join(lieux.public("saya"), "musique/mon-morceau-remix.wav"))).toBe(true);
  });

  it("refuse un morceau trop court sans laisser de fichier ni toucher la fiche", () => {
    const lieux = nouveauFilm();
    const avant = lireFicheBrute("saya", lieux.fiches);
    expect(deposerMusique("saya", "court.wav", metronome(5), lieux)).toMatchObject({ ok: false, raison: expect.stringContaining("trop court") });
    expect(lireFicheBrute("saya", lieux.fiches)).toEqual(avant);
    expect(readdirSync(join(lieux.public("saya"), "musique"))).toEqual([]);
    expect(deposerMusique("saya", "notes.txt", metronome(40), lieux)).toMatchObject({ ok: false, statut: 400 });
  });
});

describe("musique de la bibliothèque", () => {
  it("copie et mesure un morceau de la bibliothèque des tours", () => {
    const lieux = nouveauFilm();
    const fichier = join(dossierJetable("biblio"), "summer.wav");
    writeFileSync(fichier, metronome(40));
    const bibliotheque = {
      morceau: (id: string) => (id === "summer" ? { id, originalName: "Summer House.wav", filename: "summer.wav", sizeBytes: 1, durationSec: 40, uploadedAt: "" } : null),
      chemin: (id: string) => (id === "summer" ? fichier : null),
    };
    expect(deposerMusiqueDeLaBibliotheque("saya", "summer", lieux, bibliotheque)).toEqual({ ok: true });
    const fiche = lireFicheBrute("saya", lieux.fiches) as { musique: { titre: string; tempo: number } };
    expect(fiche.musique.titre).toBe("Summer House");
    expect(Math.abs(fiche.musique.tempo - 120)).toBeLessThanOrEqual(0.2);
    expect(deposerMusiqueDeLaBibliotheque("saya", "disparu", lieux, bibliotheque)).toMatchObject({ ok: false, statut: 404 });
  });
});

describe("dépôt du logo", () => {
  it("lit les proportions d'un PNG et d'un SVG et remplace le logo en texte", () => {
    const lieux = nouveauFilm();
    expect(deposerLogo("saya", "Logo Saya.png", PNG_2x1, lieux)).toEqual({ ok: true });
    let fiche = lireFicheBrute("saya", lieux.fiches) as { marque: { logo: Record<string, unknown> } };
    expect(fiche.marque.logo).toEqual({ type: "image", fichier: "logo/logo-saya.png", rapport: 2, inverser: false });
    expect(deposerLogo("saya", "logo.svg", SVG, lieux)).toEqual({ ok: true });
    fiche = lireFicheBrute("saya", lieux.fiches) as { marque: { logo: Record<string, unknown> } };
    expect(fiche.marque.logo).toMatchObject({ fichier: "logo/logo.svg", rapport: 3 });
  });

  it("refuse un JPEG (pas de transparence)", () => {
    const lieux = nouveauFilm();
    expect(deposerLogo("saya", "logo.jpg", JPEG, lieux)).toMatchObject({ ok: false, statut: 400 });
  });
});
