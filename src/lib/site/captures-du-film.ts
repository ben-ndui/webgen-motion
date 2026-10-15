import type { Browser } from "puppeteer";

import type { FilmSpec } from "../../../remotion/film/spec";
import { capturer, ecransDisponibles, empreinte, ouvrir } from "./navigateur-du-site";
import type { PagesChoisies } from "./pages-du-site";

/**
 * Les captures du film, prises sur le site : le parcours (4 pages vues au
 * téléphone), le moment clé (la même page à plusieurs hauteurs, faute de
 * pouvoir cliquer à la place du client), la preuve, et le site sur
 * ordinateur. Jamais deux images identiques dans une suite : le plan
 * resterait figé (le rendu les refuse).
 */
export type CapturesDuFilm = {
  parcours: Uint8Array[];
  moments: Uint8Array[];
  preuve: Uint8Array;
  site: Uint8Array;
};

const MOMENTS_VOULUS = 3;

export async function premierEcran(navigateur: Browser, url: string): Promise<Uint8Array> {
  const page = await ouvrir(navigateur, url, "telephone");
  try {
    return await capturer(page, 0);
  } finally {
    await page.close();
  }
}

/** Ajoute l'image si elle diffère de toutes les précédentes. */
export function ajouterSiNouvelle(liste: Uint8Array[], image: Uint8Array): boolean {
  const cle = empreinte(image);
  if (liste.some((deja) => empreinte(deja) === cle)) return false;
  liste.push(image);
  return true;
}

export async function capturerLeFilm(
  navigateur: Browser,
  accueil: string,
  pages: PagesChoisies,
  signaler: (etape: string) => void,
): Promise<CapturesDuFilm> {
  signaler("Capture du site sur ordinateur…");
  const bureau = await ouvrir(navigateur, accueil, "ordinateur");
  const site = await capturer(bureau, 0);
  await bureau.close();

  signaler("Capture de la page d'accueil au téléphone…");
  const telephone = await ouvrir(navigateur, accueil, "telephone");
  const hauteurs = await ecransDisponibles(telephone);
  const moments: Uint8Array[] = [];
  for (let ecran = 0; ecran <= hauteurs && moments.length < MOMENTS_VOULUS; ecran += 1) {
    ajouterSiNouvelle(moments, await capturer(telephone, ecran));
  }
  const parcours: Uint8Array[] = [moments[0] ?? (await capturer(telephone, 0))];

  for (const [i, url] of pages.parcours.entries()) {
    if (parcours.length >= 4) break;
    signaler(`Capture de la page ${i + 2} du parcours…`);
    try {
      ajouterSiNouvelle(parcours, await premierEcran(navigateur, url));
    } catch {
      signaler(`Page ignorée (ne s'ouvre pas) : ${url}`);
    }
  }
  // Un site trop court en pages : on complète avec l'accueil plus bas.
  for (let ecran = 1; parcours.length < 4 && ecran <= hauteurs + 3; ecran += 1) {
    ajouterSiNouvelle(parcours, await capturer(telephone, ecran));
  }

  let preuve: Uint8Array | null = null;
  if (pages.preuve) {
    signaler("Capture de la page de preuve…");
    try {
      preuve = await premierEcran(navigateur, pages.preuve);
    } catch {
      preuve = null;
    }
  }
  preuve ??= parcours.at(-1) ?? site;
  await telephone.close();
  return { parcours, moments, preuve, site };
}

/** Les noms de fichiers que la fiche citera pour ces captures. */
export function nommerLesCaptures(fiche: FilmSpec, captures: CapturesDuFilm): Map<string, Uint8Array> {
  const fichiers = new Map<string, Uint8Array>();
  captures.parcours.slice(0, 4).forEach((image, i) => fichiers.set(fiche.ecrans.parcours[i]!, image));
  // Moins de deux moments différents (page d'un seul écran) : on laisse les
  // cases vides plutôt que de poser un plan qui ne bouge pas.
  if (captures.moments.length >= 2) {
    fiche.ecrans.evenement = captures.moments.map((_, i) => `evenement-${i + 1}.png`);
    captures.moments.forEach((image, i) => fichiers.set(fiche.ecrans.evenement[i]!, image));
  }
  fichiers.set(fiche.ecrans.marque, captures.preuve);
  if (fiche.bibliotheque) fichiers.set(fiche.bibliotheque.ecranDeLAdresse, captures.site);
  return fichiers;
}
