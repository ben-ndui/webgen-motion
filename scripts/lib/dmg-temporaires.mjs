/**
 * Les images de travail du DMG (`rw.<pid>.<nom>.dmg`) que crée
 * bundle_dmg.sh pendant le build macOS : ~2 Go chacune, montées pendant
 * que Finder pose la mise en page.
 *
 * Deux pannes vécues le 16/10/2026 :
 * - le nettoyage cherchait `rw.*.webgen-motion` alors que l'app s'appelle
 *   « GEN MOTION » : rien n'était détaché, les volumes s'accumulaient ;
 * - à la fin, le démontage échoue (« Ressource occupée ») tant que macOS
 *   indexe le volume, une trentaine de secondes, et bundle_dmg.sh ne
 *   réessaie pas : le build échouait avec une app pourtant notarisée.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const IMAGE_DE_TRAVAIL = /^rw\.\d+\.(.+\.dmg)$/;

/** Les disques (/dev/diskN) des images de travail montées depuis ces dossiers. */
function disquesMontes(dossiers) {
  const info = spawnSync("hdiutil", ["info"], { encoding: "utf-8" }).stdout ?? "";
  const disques = [];
  for (const bloc of info.split(/={5,}/)) {
    const chemin = bloc.match(/image-path\s*:\s*(.+)/)?.[1]?.trim() ?? "";
    const nom = chemin.split("/").pop() ?? "";
    if (!IMAGE_DE_TRAVAIL.test(nom) || !dossiers.some((d) => chemin.startsWith(d))) continue;
    const disque = bloc.match(/^\/dev\/disk\d+(?=\s)/m)?.[0];
    if (disque) disques.push(disque);
  }
  return disques;
}

/** Détache en réessayant : le volume reste occupé tant que macOS l'indexe. */
function detacher(disque, log, essais = 20) {
  for (let i = 1; i <= essais; i += 1) {
    if (spawnSync("hdiutil", ["detach", disque], { stdio: "ignore" }).status === 0) return true;
    spawnSync("sleep", ["3"]);
  }
  log(`${disque} toujours occupé après ${essais} essais : détachement forcé`);
  return spawnSync("hdiutil", ["detach", disque, "-force"], { stdio: "ignore" }).status === 0;
}

/** Avant un build : détache et supprime les images laissées par les builds précédents. */
export function nettoyerLesImagesDeTravail(dossiers, log) {
  for (const disque of disquesMontes(dossiers)) {
    log(`détache l'image de travail ${disque}`);
    detacher(disque, log, 3);
  }
  let liberesMo = 0;
  for (const dossier of dossiers.filter(existsSync)) {
    for (const fichier of readdirSync(dossier).filter((f) => IMAGE_DE_TRAVAIL.test(f))) {
      const chemin = join(dossier, fichier);
      try {
        liberesMo += Math.round(statSync(chemin).size / 1e6);
        unlinkSync(chemin);
      } catch {
        log(`impossible de supprimer ${fichier} (verrouillé)`);
      }
    }
  }
  if (liberesMo > 0) log(`✓ ${liberesMo} Mo d'images de travail libérés`);
}

/**
 * Après un échec de bundle_dmg.sh au démontage : termine son travail
 * (détacher avec patience, puis compresser). Rend le chemin du DMG, ou
 * null s'il n'y a rien à reprendre ou si la compression échoue.
 */
export function terminerLeDmg(dossierDmg, log) {
  if (!existsSync(dossierDmg)) return null;
  const travail = readdirSync(dossierDmg).find((f) => IMAGE_DE_TRAVAIL.test(f));
  if (!travail) return null;
  for (const disque of disquesMontes([dossierDmg])) {
    if (!detacher(disque, log)) return null;
  }
  const final = join(dossierDmg, travail.match(IMAGE_DE_TRAVAIL)[1]);
  if (existsSync(final)) unlinkSync(final);
  const conversion = spawnSync(
    "hdiutil",
    ["convert", join(dossierDmg, travail), "-format", "UDZO", "-imagekey", "zlib-level=9", "-o", final],
    { stdio: "inherit" },
  );
  if (conversion.status !== 0) return null;
  unlinkSync(join(dossierDmg, travail));
  return final;
}
