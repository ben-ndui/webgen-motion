/**
 * Runner du mode « Film de marque » : rend une déclinaison d'une fiche
 * `films/<id>.json` avec la composition Remotion `Film` (remotion/film/).
 *
 *   npx tsx scripts/render-film.ts --film-id kotizo [--declinaison Court-FR] [--bibliotheque]
 *
 * Sans `--declinaison`, rend toutes celles de la fiche, l'une après l'autre.
 * Avec `--bibliotheque`, rend la composition `Bibliotheque` (les plans de la
 * bibliothèque de la fiche) dans `<declinaison>.bibliotheque.mp4`, avec son
 * propre verrou : film et bibliothèque d'une déclinaison ne se gênent pas.
 * Avant Remotion (src/lib/film-rendu.ts, partagé avec la route) : la fiche
 * est validée (toutes les erreurs, avec le chemin du champ), refusée si elle
 * est encore l'exemple, et chaque média attendu est vérifié dans
 * `~/.webgen-motion/films/<id>/public/` (chemin exact de chaque manquant).
 *
 * Remotion écrit dans `.<declinaison>.en-cours.mp4`, renommé en
 * `<declinaison>.mp4` seulement si le rendu réussit. Un verrou par
 * déclinaison empêche deux rendus du même fichier en même temps.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { ensureBrowser } from "@remotion/renderer";

import { ensureChromium, remotionBrowserArgs, resolveChromiumExecutable } from "../src/lib/chromium";
import { isFeatureEnabled } from "../src/lib/edition";
import { POIDS_MINIMUM_D_UN_RENDU } from "../src/lib/film-etat";
import { chargerFilm } from "../src/lib/film-loader";
import { type RenduPrepare, preparerRendu } from "../src/lib/film-rendu";
import { estNomSur } from "../src/lib/film-store";
import { garderLaPolice } from "../src/lib/polices-locales";
import { descendantsDe } from "../src/lib/process-tree";

function argument(drapeau: string): string | undefined {
  const index = process.argv.indexOf(drapeau);
  return index === -1 ? undefined : process.argv[index + 1];
}

function arreter(message: string): never {
  console.error(message);
  process.exit(1);
}

function processusVivant(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// Le verrou contient le pid du runner qui rend. Un verrou laissé par un
// runner mort (crash, kill -9) est repris ; celui d'un runner vivant bloque.
function prendreLeVerrou(verrou: string, nom: string): void {
  try {
    writeFileSync(verrou, String(process.pid), { flag: "wx" });
    return;
  } catch {
    const pid = Number(readFileSync(verrou, "utf-8").trim());
    if (Number.isInteger(pid) && pid > 0 && processusVivant(pid)) {
      arreter(`Rendu refusé : « ${nom} » est déjà en cours de rendu (pid ${pid}).`);
    }
    rmSync(verrou, { force: true });
    writeFileSync(verrou, String(process.pid), { flag: "wx" });
  }
}

function rendreLeVerrou(verrou: string): void {
  if (existsSync(verrou) && readFileSync(verrou, "utf-8").trim() === String(process.pid)) {
    rmSync(verrou, { force: true });
  }
}

/**
 * Le navigateur du rendu. Hors app packagée, c'est celui de REMOTION
 * (chrome-headless-shell, téléchargé une fois) et non le Google Chrome de
 * l'utilisateur : le Chrome complet démarrait parfois après le délai de
 * 25 s de Remotion (machine chargée, Chrome en pleine mise à jour), et le
 * rendu échouait sur « Timed out … trying to connect to the browser »
 * (constaté le 11/10/2026). Une surcharge explicite reste possible.
 */
async function navigateur(): Promise<string | undefined> {
  const surcharge = process.env.WEBGEN_CHROMIUM_BIN?.trim();
  if (surcharge) return (await resolveChromiumExecutable())?.path;
  if (process.env.WEBGEN_RUNNERS_DIR) {
    // App packagée : le navigateur partagé avec la capture.
    const resolu = await resolveChromiumExecutable();
    return resolu ? resolu.path : (await ensureChromium()).path;
  }
  await ensureBrowser();
  return undefined;
}

function argumentsRemotion(rendu: RenduPrepare, cheminNavigateur: string | undefined): string[] {
  const cli = resolve(process.cwd(), "node_modules", "@remotion", "cli", "remotion-cli.js");
  return [
    cli,
    "render",
    rendu.composition,
    rendu.partiel,
    "--props",
    JSON.stringify({ spec: rendu.spec, declinaison: rendu.declinaison, ...(rendu.episode ? { episode: rendu.episode } : {}) }),
    "--public-dir",
    rendu.dossierPublic,
    // « angle » partout, JAMAIS « swangle » : le rasterizer logiciel tuile
    // les couches animées en grille (voir compose-tour.ts et le manifeste).
    "--gl",
    "angle",
    // Même qualité que le gabarit film-motion (`npm run rendu`).
    "--crf",
    "16",
    "--concurrency",
    "4",
    "--timeout",
    "120000",
    "--log",
    "info",
    ...remotionBrowserArgs(cheminNavigateur),
  ];
}

// Le rendu en cours, pour l'annulation (la route tue le groupe de process).
// Remotion et son navigateur sont tués SUR-LE-CHAMP (SIGKILL), navigateur
// compris : sur SIGTERM, Remotion continuait à rendre et relançait un Chrome
// hors du groupe (constaté le 06/10/2026). Tout se fait de façon synchrone,
// car en dev tsx peut tuer ce runner juste après (un verrou laissé par un
// runner mort se reprend au rendu suivant).
let enCours: { remotion: ReturnType<typeof spawn>; partiel: string; verrou: string } | null = null;
let interrompu = false;

function interrompre(): void {
  if (interrompu) return;
  interrompu = true;
  if (enCours?.remotion.pid) {
    const remotion = enCours.remotion.pid;
    for (const pid of [...descendantsDe(remotion), remotion]) {
      try {
        process.kill(pid, "SIGKILL");
      } catch {}
    }
    rmSync(enCours.partiel, { force: true });
    rendreLeVerrou(enCours.verrou);
  }
  process.exit(143);
}
// `on` et pas `once` : le SIGTERM arrive DEUX fois (le groupe, puis tsx qui
// le relaie). Avec `once`, le second tuait le runner en plein nettoyage.
process.on("SIGTERM", interrompre);
process.on("SIGINT", interrompre);

function rendre(rendu: RenduPrepare, cheminNavigateur: string | undefined): Promise<void> {
  const nom = rendu.declinaison.nom;
  mkdirSync(rendu.dossierDeSortie, { recursive: true });
  prendreLeVerrou(rendu.verrou, nom);
  // Reste d'une tentative interrompue : jamais repris pour un livrable.
  rmSync(rendu.partiel, { force: true });

  const quoi = rendu.type === "bibliotheque" ? " · bibliothèque" : rendu.type === "episode" ? ` · épisode ${rendu.episode}` : "";
  console.log(`▶ Film ${nom}${quoi} (${rendu.declinaison.langue}, ${rendu.declinaison.version})`);
  console.log(`  Public dir : ${rendu.dossierPublic}`);
  console.log(`  Sortie     : ${rendu.sortie}`);

  const remotion = spawn(process.execPath, argumentsRemotion(rendu, cheminNavigateur), {
    cwd: process.cwd(),
    stdio: "inherit",
    env: { ...process.env, NO_COLOR: "1" },
  });

  const nettoyer = () => {
    rmSync(rendu.partiel, { force: true });
    rendreLeVerrou(rendu.verrou);
  };
  enCours = { remotion, partiel: rendu.partiel, verrou: rendu.verrou };

  return new Promise((terminer) => {
    remotion.on("error", (erreur) => {
      nettoyer();
      arreter(`Lancement de Remotion impossible : ${erreur.message}`);
    });
    remotion.on("close", (code) => {
      if (interrompu) return;
      if (code !== 0) {
        nettoyer();
        arreter(`Rendu Remotion en échec (code ${code}) pour « ${nom} ».`);
      }
      if (!existsSync(rendu.partiel) || statSync(rendu.partiel).size < POIDS_MINIMUM_D_UN_RENDU) {
        nettoyer();
        arreter(`Rendu terminé mais vidéo absente ou vide pour « ${nom} ».`);
      }
      renameSync(rendu.partiel, rendu.sortie);
      rendreLeVerrou(rendu.verrou);
      enCours = null;
      console.log(`✓ Done → ${rendu.sortie}`);
      terminer();
    });
  });
}

async function principal(): Promise<void> {
  const filmId = argument("--film-id");
  if (!estNomSur(filmId)) arreter("Usage : render-film.ts --film-id <id> [--declinaison <nom>] [--bibliotheque | --episode <id>]");
  const episode = argument("--episode");
  if (episode !== undefined && !estNomSur(episode)) arreter("--episode : lettres, chiffres, _ et - seulement");
  const type = episode !== undefined ? "episode" : process.argv.includes("--bibliotheque") ? "bibliotheque" : "film";
  if (!isFeatureEnabled("film-de-marque")) {
    arreter(
      "Le rendu des films de marque est une feature Studio Edition. Active ta license (.license) ou, en dev : WEBGEN_MOTION_EDITION=studio",
    );
  }

  const fiche = chargerFilm(filmId);
  if (!fiche) arreter(`Rendu refusé : fiche introuvable (films/${filmId}.json).`);
  if (fiche.etat === "invalide") {
    arreter(`Rendu refusé, fiche invalide (films/${filmId}.json) :\n  - ${fiche.erreurs.join("\n  - ")}`);
  }
  const demandee = argument("--declinaison");
  const noms = demandee !== undefined ? [demandee] : fiche.spec.declinaisons.map((declinaison) => declinaison.nom);

  // Tout se vérifie AVANT le premier rendu : on ne découvre pas au troisième
  // livrable qu'une capture anglaise manque.
  const rendus: RenduPrepare[] = [];
  for (const nom of noms) {
    const preparation = preparerRendu(filmId, nom, { type, episode });
    if (!preparation.ok) {
      arreter(`Rendu refusé (${filmId} · ${nom}) :\n  - ${preparation.erreurs.join("\n  - ")}`);
    }
    rendus.push(preparation);
  }

  // La police de la marque, gardée sur l'ordinateur : le rendu ne dépend plus
  // de la connexion (15/10/2026 : une coupure faisait échouer tout le film).
  const famille = fiche.spec.marque.police;
  const police = await garderLaPolice(famille, rendus[0]!.dossierPublic);
  if (!police.ok && police.horsLigne) arreter(police.raison);
  console.log(police.ok ? `  Police : ${famille}, sur l'ordinateur${police.telecharges > 0 ? " (téléchargée)" : ""}` : `  Police : ${police.raison}`);

  const cheminNavigateur = await navigateur();
  console.log(`  Navigateur du rendu : ${cheminNavigateur ?? "chrome-headless-shell (Remotion)"}`);
  for (const rendu of rendus) await rendre(rendu, cheminNavigateur);
}

principal().catch((erreur: unknown) => arreter(`Rendu en échec : ${(erreur as Error).message}`));
