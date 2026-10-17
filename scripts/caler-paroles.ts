/**
 * Runner des paroles d'un karaoké (projet de format), EN LOCAL :
 *
 *   npx tsx scripts/caler-paroles.ts --id <projet> --etape brouillon [--langue fr]
 *     → public/paroles/brouillon.txt : ce que whisper entend, une ligne par phrase ;
 *   npx tsx scripts/caler-paroles.ts --id <projet> --etape calage [--langue fr]
 *     → les lignes de public/paroles/paroles.txt (écrites par l'artiste),
 *       calées mot à mot, dans le fichier que cite la fiche (spec.paroles).
 *
 * Méthode et pièges : src/lib/formats/karaoke-ecoute.ts.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { lignesChantees } from "../remotion/film/karaoke/alignement";
import { chargerProjet } from "../src/lib/formats/format-loader";
import { getFormatPublicDir } from "../src/lib/formats/format-store";
import { SEUIL_DE_RECONNAISSANCE, calerLesParolesDuMorceau, ecrireLeBrouillon } from "../src/lib/formats/karaoke-ecoute";
import { CHEMINS_DES_PAROLES } from "../src/lib/formats/karaoke-paroles";
import { outilsWhisper } from "../src/lib/whisper";
import { argument, arreter } from "./lib/rendu-remotion";

function principal(): void {
  const id = argument("--id") ?? "";
  const etape = argument("--etape");
  const langue = argument("--langue") ?? "fr";
  if (!/^[a-z]{2}$|^auto$/.test(langue)) arreter("--langue : deux lettres (fr, en…) ou auto");
  const projet = chargerProjet(id);
  if (!projet) arreter(`Projet introuvable : ${id}`);
  if (projet.etat === "invalide") arreter(`Le projet a des erreurs :\n  - ${projet.erreurs.join("\n  - ")}`);
  if (projet.fiche.format !== "karaoke") arreter("Ce projet n'est pas un karaoké.");
  const outils = outilsWhisper();
  if (!outils.ok) arreter(outils.raison);

  const publicDir = getFormatPublicDir(id);
  const morceau = join(publicDir, projet.fiche.spec.morceau.fichier);
  if (!existsSync(morceau)) arreter("Dépose d'abord ton morceau.");
  console.log(`▶ Paroles ${etape} (${langue})`);

  if (etape === "brouillon") {
    const lignes = ecrireLeBrouillon(outils, morceau, langue, console.log);
    if (lignes.length === 0) arreter("whisper n'a entendu aucune voix dans ce morceau.");
    const fichier = join(publicDir, CHEMINS_DES_PAROLES.brouillon);
    mkdirSync(dirname(fichier), { recursive: true });
    writeFileSync(fichier, `${lignes.join("\n")}\n`);
    console.log(`✓ Brouillon : ${lignes.length} lignes`);
    return;
  }
  if (etape === "calage") {
    const texte = join(publicDir, CHEMINS_DES_PAROLES.texte);
    if (!existsSync(texte)) arreter("Écris d'abord tes paroles.");
    const lignes = lignesChantees(readFileSync(texte, "utf-8"));
    const { lignes: calees, reconnus } = calerLesParolesDuMorceau(outils, morceau, lignes, langue, console.log);
    if (reconnus < SEUIL_DE_RECONNAISSANCE) {
      arreter(`Seulement ${Math.round(reconnus * 100)} % des mots reconnus : ces paroles ne sont probablement pas celles de ce morceau.`);
    }
    const fichier = join(publicDir, projet.fiche.spec.paroles);
    mkdirSync(dirname(fichier), { recursive: true });
    writeFileSync(fichier, `${JSON.stringify({ source: "paroles.txt", reconnus, lignes: calees })}\n`);
    console.log(`✓ Calées : ${calees.length} lignes, ${Math.round(reconnus * 100)} % des mots reconnus`);
    return;
  }
  arreter("--etape : brouillon ou calage");
}

try {
  principal();
} catch (erreur) {
  arreter(`Paroles en échec : ${(erreur as Error).message}`);
}
