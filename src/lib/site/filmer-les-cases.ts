import { copyFileSync, mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { Browser } from "puppeteer";

import type { FilmSpec, Langue } from "../../../remotion/film/spec";
import { ecrireAtomiquement } from "../film-fichiers-deposes";
import { remplacerUnEcran } from "../film-ecrans";
import { ajouterSiNouvelle, premierEcran } from "./captures-du-film";
import type { GroupeDEcrans } from "./choix-des-pages";
import { capturer, ecransDisponibles, ouvrir } from "./navigateur-du-site";
import { filmerUnePage } from "./video-du-site";

/**
 * Pose dans leurs cases les pages que la personne a GARDÉES (proposées par
 * Claude ou choisies dans la liste). Elle a cliqué « Garder » : la case est
 * remplacée, même si elle avait déjà une capture. Le parcours et la preuve
 * reçoivent une image, puis une vidéo si la page défile ; le moment clé, la
 * même page à plusieurs hauteurs. SERVEUR SEULEMENT (navigateur).
 */
// `echecs` : les pages qui ne se sont pas ouvertes ; leur case garde ce qu'elle avait.
export type CasesFilmees = { ok: true; posees: string[]; echecs: string[]; moments?: number } | { ok: false; raison: string };

const sansExtension = (nom: string) => nom.replace(/\.[^.]+$/, "");

function poserPartout(fiche: FilmSpec, langues: Langue[], dossierPublic: string, nom: string, contenu: Uint8Array): string[] {
  return langues.map((langue) => {
    const relatif = `${fiche.textes[langue].dossierDesEcrans}/${nom}`;
    ecrireAtomiquement(join(dossierPublic, relatif), contenu);
    return relatif;
  });
}

async function filmerUneCase(
  navigateur: Browser,
  fiche: FilmSpec,
  langues: Langue[],
  dossierPublic: string,
  nomActuel: string,
  url: string,
): Promise<string[]> {
  const base = sansExtension(nomActuel);
  const posees = poserPartout(fiche, langues, dossierPublic, `${base}.png`, await premierEcran(navigateur, url));
  remplacerUnEcran(fiche, nomActuel, `${base}.png`);
  // Une page qui défile devient un écran vivant ; sinon l'image suffit.
  const video = join(mkdtempSync(join(tmpdir(), "genmotion-case-")), `${base}.mp4`);
  const filmee = await filmerUnePage(navigateur, url, video, "telephone").catch(() => null);
  if (filmee?.ok && filmee.defile) {
    for (const langue of langues) {
      const relatif = `${fiche.textes[langue].dossierDesEcrans}/${base}.mp4`;
      mkdirSync(dirname(join(dossierPublic, relatif)), { recursive: true });
      copyFileSync(video, join(dossierPublic, relatif));
      posees.push(relatif);
    }
    remplacerUnEcran(fiche, `${base}.png`, `${base}.mp4`);
  }
  return posees;
}

async function filmerLesMoments(navigateur: Browser, fiche: FilmSpec, langues: Langue[], dossierPublic: string, url: string): Promise<CasesFilmees> {
  const page = await ouvrir(navigateur, url, "telephone");
  const images: Uint8Array[] = [];
  try {
    const hauteurs = await ecransDisponibles(page);
    for (let ecran = 0; ecran <= hauteurs && images.length < fiche.ecrans.evenement.length; ecran += 1) {
      ajouterSiNouvelle(images, await capturer(page, ecran));
    }
  } finally {
    await page.close();
  }
  if (images.length < 2) return { ok: false, raison: "Cette page ne change pas en défilant : le moment clé resterait figé. Choisis-en une autre." };
  // Moins d'états différents que de cases : on garde ceux qui existent (deux au moins).
  fiche.ecrans.evenement = fiche.ecrans.evenement.slice(0, images.length);
  const posees: string[] = [];
  images.forEach((image, i) => {
    const nomActuel = fiche.ecrans.evenement[i]!;
    const nom = `${sansExtension(nomActuel)}.png`;
    posees.push(...poserPartout(fiche, langues, dossierPublic, nom, image));
    remplacerUnEcran(fiche, nomActuel, nom);
  });
  return { ok: true, posees, echecs: [], moments: images.length };
}

export async function filmerLesCases(
  navigateur: Browser,
  fiche: FilmSpec,
  groupe: GroupeDEcrans,
  urls: string[],
  langues: Langue[],
  dossierPublic: string,
  signaler: (etape: string) => void,
): Promise<CasesFilmees> {
  if (groupe === "moments") {
    signaler("On capture le moment clé, écran par écran…");
    return filmerLesMoments(navigateur, fiche, langues, dossierPublic, urls[0]!);
  }
  const noms = groupe === "parcours" ? [...fiche.ecrans.parcours] : [fiche.ecrans.marque];
  const posees: string[] = [];
  const echecs: string[] = [];
  for (const [i, url] of urls.entries()) {
    if (!noms[i]) break;
    const libelle = groupe === "parcours" ? `l'étape ${i + 1}` : "la preuve";
    signaler(`On filme ${libelle}…`);
    try {
      posees.push(...(await filmerUneCase(navigateur, fiche, langues, dossierPublic, noms[i]!, url)));
    } catch {
      echecs.push(`${libelle} (${url} ne s'ouvre pas)`);
    }
  }
  if (posees.length === 0) return { ok: false, raison: `Aucune page ne s'est ouverte : ${echecs.join(", ")}.` };
  return { ok: true, posees, echecs };
}
