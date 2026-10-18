/**
 * Ce que les runners de rendu (`render-film.ts`, `render-format.ts`) partagent :
 * le verrou par livrable, le navigateur du rendu, le lancement de Remotion
 * dans un fichier PARTIEL renommé seulement en cas de succès, et l'arrêt
 * propre sur annulation. Déplacé tel quel de render-film.ts le 16/10/2026.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { ensureBrowser } from "@remotion/renderer";

import { ensureChromium, remotionBrowserArgs, resolveChromiumExecutable } from "../../src/lib/chromium";
import { POIDS_MINIMUM_D_UN_RENDU } from "../../src/lib/film-etat";
import { descendantsDe } from "../../src/lib/process-tree";

/** Un rendu prêt à lancer : la composition, ses props, et ses trois fichiers (film-store.fichiersDuRendu). */
export type RenduALancer = {
  composition: string;
  props: Record<string, unknown>;
  dossierPublic: string;
  dossierDeSortie: string;
  sortie: string;
  partiel: string;
  verrou: string;
  // Ce que le journal affiche : le nom du livrable, et la ligne « ▶ … » lue par la route.
  nom: string;
  entete: string;
};

export function argument(drapeau: string): string | undefined {
  const index = process.argv.indexOf(drapeau);
  return index === -1 ? undefined : process.argv[index + 1];
}

export function arreter(message: string): never {
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
export async function navigateur(): Promise<string | undefined> {
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

function argumentsRemotion(rendu: RenduALancer, cheminNavigateur: string | undefined): string[] {
  const cli = resolve(process.cwd(), "node_modules", "@remotion", "cli", "remotion-cli.js");
  return [
    cli,
    "render",
    rendu.composition,
    rendu.partiel,
    "--props",
    JSON.stringify(rendu.props),
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

export function rendre(rendu: RenduALancer, cheminNavigateur: string | undefined): Promise<void> {
  const nom = rendu.nom;
  mkdirSync(rendu.dossierDeSortie, { recursive: true });
  prendreLeVerrou(rendu.verrou, nom);
  // Reste d'une tentative interrompue : jamais repris pour un livrable.
  rmSync(rendu.partiel, { force: true });

  console.log(rendu.entete);
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
