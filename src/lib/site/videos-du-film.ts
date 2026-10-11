import { copyFileSync, existsSync, mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { Browser } from "puppeteer";

import type { FilmSpec, Langue } from "../../../remotion/film/spec";
import { remplacerUnEcran } from "../film-ecrans";
import type { PagesChoisies } from "./pages-du-site";
import { filmerUnePage } from "./video-du-site";

/**
 * Les écrans VIVANTS du film, filmés sur le site : chaque étape du parcours
 * (l'accueil puis les pages du menu), la preuve, et le site sur ordinateur
 * pour le Reel boutique. Rend les vidéos (dans un dossier temporaire) par
 * case de la fiche ; une page qui ne s'ouvre pas laisse sa case en image.
 */
export type VideosDuFilm = Map<string, string>;

export async function filmerLeFilm(
  navigateur: Browser,
  fiche: FilmSpec,
  accueil: string,
  pages: PagesChoisies,
  signaler: (etape: string) => void,
): Promise<VideosDuFilm> {
  const dossier = mkdtempSync(join(tmpdir(), "genmotion-videos-"));
  const videos: VideosDuFilm = new Map();
  const tournages: { nom: string; url: string; format: "telephone" | "ordinateur"; libelle: string }[] = [
    ...[accueil, ...pages.parcours].slice(0, fiche.ecrans.parcours.length).map((url, i) => ({
      nom: fiche.ecrans.parcours[i]!, url, format: "telephone" as const, libelle: `l'étape ${i + 1} du parcours`,
    })),
  ];
  if (pages.preuve) tournages.push({ nom: fiche.ecrans.marque, url: pages.preuve, format: "telephone", libelle: "la preuve" });
  if (fiche.bibliotheque) tournages.push({ nom: fiche.bibliotheque.ecranDeLAdresse, url: accueil, format: "ordinateur", libelle: "le site sur ordinateur" });

  for (const tournage of tournages) {
    signaler(`On filme ${tournage.libelle}…`);
    const chemin = join(dossier, `${tournage.nom.replace(/\.[^.]+$/, "")}.mp4`);
    try {
      const resultat = await filmerUnePage(navigateur, tournage.url, chemin, tournage.format);
      // Une page qui ne défile pas ferait une vidéo immobile : l'image suffit.
      if (resultat.ok && resultat.defile) videos.set(tournage.nom, chemin);
    } catch {
      signaler(`Page non filmée (ne s'ouvre pas) : ${tournage.url}`);
    }
  }
  return videos;
}

/** « parcours-2.png » → « parcours-2.mp4 ». */
export function nomDeLaVideo(nom: string): string {
  return nom.replace(/\.[^.]+$/, "") + ".mp4";
}

/** Fait citer la vidéo par la fiche partout où l'image l'était (parcours, éventail, preuve, site). */
export function citerLaVideo(fiche: FilmSpec, image: string): void {
  remplacerUnEcran(fiche, image, nomDeLaVideo(image));
}

/**
 * Pose les vidéos dans le film. Une case reçoit sa vidéo seulement si son
 * image manque, ou si c'est GEN MOTION qui l'avait posée (clé « capture: »
 * des propositions) : une image déposée à la main n'est jamais remplacée.
 * Rend les chemins posés, à noter dans les propositions.
 */
export function poserLesVideos(
  spec: FilmSpec,
  videos: VideosDuFilm,
  langues: Langue[],
  dossierPublic: string,
  propositions: Record<string, string>,
  // Accord explicite de remplacer TOUTES les captures (case cochée dans l'assistant).
  remplacerTout = false,
): { posees: string[]; gardees: number } {
  const posees: string[] = [];
  let gardees = 0;
  for (const [image, video] of videos) {
    const cases = langues.map((langue) => spec.textes[langue].dossierDesEcrans).map((dossier) => ({
      image: `${dossier}/${image}`,
      video: `${dossier}/${nomDeLaVideo(image)}`,
    }));
    const libre = (c: { image: string; video: string }) =>
      remplacerTout ||
      !existsSync(join(dossierPublic, c.image)) || `capture:${c.image}` in propositions || `capture:${c.video}` in propositions;
    // La fiche est commune aux langues : on ne passe en vidéo que si TOUTES les cases le permettent.
    if (!cases.every(libre)) {
      gardees += 1;
      continue;
    }
    for (const c of cases) {
      mkdirSync(dirname(join(dossierPublic, c.video)), { recursive: true });
      copyFileSync(video, join(dossierPublic, c.video));
      posees.push(c.video);
    }
    citerLaVideo(spec, image);
  }
  return { posees, gardees };
}
