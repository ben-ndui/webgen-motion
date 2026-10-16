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
import { isFeatureEnabled } from "../src/lib/edition";
import { chargerFilm } from "../src/lib/film-loader";
import { type RenduPrepare, preparerRendu } from "../src/lib/film-rendu";
import { estNomSur } from "../src/lib/film-store";
import { garderLaPolice } from "../src/lib/polices-locales";
import { argument, arreter, navigateur, rendre } from "./lib/rendu-remotion";

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
  for (const rendu of rendus) {
    const quoi = rendu.type === "bibliotheque" ? " · bibliothèque" : rendu.type === "episode" ? ` · épisode ${rendu.episode}` : "";
    await rendre(
      {
        composition: rendu.composition,
        props: { spec: rendu.spec, declinaison: rendu.declinaison, ...(rendu.episode ? { episode: rendu.episode } : {}) },
        dossierPublic: rendu.dossierPublic,
        dossierDeSortie: rendu.dossierDeSortie,
        sortie: rendu.sortie,
        partiel: rendu.partiel,
        verrou: rendu.verrou,
        nom: rendu.declinaison.nom,
        entete: `▶ Film ${rendu.declinaison.nom}${quoi} (${rendu.declinaison.langue}, ${rendu.declinaison.version})`,
      },
      cheminNavigateur,
    );
  }
}

principal().catch((erreur: unknown) => arreter(`Rendu en échec : ${(erreur as Error).message}`));
