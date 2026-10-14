#!/usr/bin/env node
/**
 * « Remplir depuis mon site » : GEN MOTION ouvre le site, le capture au
 * téléphone et sur ordinateur, devine la marque, et (avec une clé Claude)
 * propose les textes de « Ton histoire ». Tout arrive dans la fiche, marqué
 * « proposé », sans jamais écraser ce que la personne a déjà écrit.
 *
 *   tsx scripts/remplir-film.ts --film-id <id> --url <adresse> [--remplacer-captures]
 *
 * Progression en NDJSON sur stdout (même contrat que agent-generate-tour) :
 * { type: "phase", label } … puis { type: "done", resume } ou { type: "error", message }.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

import { getAvailableFonts } from "@remotion/google-fonts";

import { resolveAgent } from "../src/lib/config-resolve";
import { enregistrerFilm } from "../src/lib/film-ecriture";
import { ecrireAtomiquement, nomDeFichierSur } from "../src/lib/film-fichiers-deposes";
import { languesDuFilm } from "../src/lib/film-fiche-depart";
import { chargerFilm } from "../src/lib/film-loader";
import { estNomSur, getFilmPublicDir } from "../src/lib/film-store";
import { capturerLeFilm, nommerLesCaptures } from "../src/lib/site/captures-du-film";
import { filmerLeFilm, poserLesVideos } from "../src/lib/site/videos-du-film";
import { lireLaPage } from "../src/lib/site/lecture-du-site";
import { trouverLeLogo } from "../src/lib/site/logo-du-site";
import { devinerLaMarque } from "../src/lib/site/marque-du-site";
import { lancerLeNavigateur, ouvrir } from "../src/lib/site/navigateur-du-site";
import { adresseLisible, choisirLesPages, normaliserLAdresse } from "../src/lib/site/pages-du-site";
import { ecrirePropositions, ecrireSuggestions, lirePropositions } from "../src/lib/site/propositions-store";
import { redigerAvecClaude } from "../src/lib/site/redaction-claude";
import { remplirLaFiche } from "../src/lib/site/remplissage";
import { ecrireUnEpisodePourLaFiche } from "../src/lib/cinema/scenario-claude";
import { briefDepuisLeSite, serieVierge } from "../src/lib/site/serie-du-site";

function emettre(evenement: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify(evenement)}\n`);
}
const phase = (label: string) => emettre({ type: "phase", label });

function argument(drapeau: string): string | undefined {
  const i = process.argv.indexOf(drapeau);
  return i === -1 ? undefined : process.argv[i + 1];
}

function arreter(message: string): never {
  emettre({ type: "error", message });
  process.exit(1);
}

async function principal(): Promise<void> {
  const id = argument("--film-id");
  if (!estNomSur(id)) arreter("Film invalide.");
  const url = normaliserLAdresse(argument("--url") ?? "");
  if (!url) arreter("Cette adresse ne ressemble pas à un site (exemple : monsite.fr).");
  const fiche = chargerFilm(id);
  if (!fiche) arreter("Film introuvable.");
  if (fiche.etat === "invalide") arreter("La fiche du film a des erreurs : corrige-les d'abord.");
  const langues = languesDuFilm(fiche.spec);
  const dossierPublic = getFilmPublicDir(id);

  phase(`Ouverture de ${adresseLisible(url)}…`);
  const navigateur = await lancerLeNavigateur();
  try {
    const accueil = await ouvrir(navigateur, url, "ordinateur");
    const lecture = await lireLaPage(accueil);
    await accueil.close();

    phase("Lecture de ta marque (couleurs, police, logo)…");
    const catalogue = new Set(getAvailableFonts().map((police) => police.fontFamily));
    const marque = devinerLaMarque(lecture.couleurs, lecture.polices, catalogue);
    const logo = await trouverLeLogo(lecture.logos);

    const pages = choisirLesPages(lecture.liens);
    const captures = await capturerLeFilm(navigateur, url, pages, phase);
    const spec = structuredClone(fiche.spec);
    const fichiers = nommerLesCaptures(spec, captures);
    const dejaProposees = lirePropositions(id);
    // Une capture déjà là (déposée à la main, ou d'un remplissage précédent)
    // n'est jamais remplacée : même règle que pour les textes.
    let gardees = 0;
    const capturesPosees: string[] = [];
    for (const langue of langues) {
      for (const [nom, image] of fichiers) {
        const relatif = `${spec.textes[langue].dossierDesEcrans}/${nom}`;
        if (existsSync(join(dossierPublic, relatif))) gardees += 1;
        else {
          ecrireAtomiquement(join(dossierPublic, relatif), image);
          capturesPosees.push(relatif);
        }
      }
    }
    const nosCaptures = { ...dejaProposees, ...Object.fromEntries(capturesPosees.map((r) => [`capture:${r}`, r])) };
    const remplacerTout = process.argv.includes("--remplacer-captures");
    const videos = poserLesVideos(spec, await filmerLeFilm(navigateur, spec, url, pages, phase), langues, dossierPublic, nosCaptures, remplacerTout);
    capturesPosees.push(...videos.posees);

    let histoires = {};
    let rejetes: string[] = [];
    let redaction = "sans clé Claude : les textes restent à écrire";
    const agent = resolveAgent();
    if (agent) {
      phase("Claude rédige ton histoire à partir du site…");
      // Les écrans du parcours tels qu'ils sont filmés : l'accueil, puis les pages du menu.
      const ecrans = ["Accueil", ...pages.parcours.map((page) => lecture.liens.find((l) => l.url === page)?.texte || new URL(page).pathname)];
      const resultat = await redigerAvecClaude(lecture, langues, agent, ecrans.slice(0, spec.ecrans.parcours.length));
      if (resultat.ok) {
        histoires = resultat.histoires;
        rejetes = resultat.rejetes;
        redaction = "textes proposés par Claude";
      } else {
        redaction = resultat.raison;
      }
    }

    phase("Remplissage de la fiche…");
    const { fiche: remplie, propositions, suggestions } = remplirLaFiche(spec, { marque, adresse: adresseLisible(url), histoires }, dejaProposees);
    // Les captures et vidéos posées par GEN MOTION : un prochain remplissage pourra les remplacer.
    for (const relatif of capturesPosees) propositions[`capture:${relatif}`] = relatif;
    if (logo && remplie.marque.logo.type === "motSymbole") {
      const relatif = `logo/${nomDeFichierSur(adresseLisible(url))}.${logo.genre}`;
      ecrireAtomiquement(join(dossierPublic, relatif), logo.octets);
      remplie.marque.logo = { type: "image", fichier: relatif, rapport: logo.rapport, inverser: false };
      propositions["marque.logo"] = relatif;
    }
    // La série : un premier épisode proposé, seulement si elle n'a jamais été touchée.
    // Une série déjà commencée n'est jamais remplacée : on ne réécrit pas ce que la personne a écrit.
    let serie = "série déjà commencée : rien changé";
    if (serieVierge(remplie) && !agent) {
      serie = "sans clé Claude : pas d'épisode proposé";
    } else if (serieVierge(remplie) && agent) {
      phase("Claude écrit un premier épisode de série…");
      const episode = await ecrireUnEpisodePourLaFiche(remplie, briefDepuisLeSite(lecture), agent);
      if (episode.ok) {
        remplie.cinema = episode.cinema;
        const plans = episode.cinema.episodes.flatMap((e) => e.scenes.flatMap((s) => s.plans)).length;
        propositions["cinema"] = episode.episodeId;
        serie = `un premier épisode proposé (${plans} plans), à relire dans « Ta série »`;
      } else {
        serie = `pas d'épisode proposé : ${episode.raison}`;
      }
    }

    const ecriture = enregistrerFilm(id, remplie);
    if (!ecriture.ok) arreter(ecriture.raison);
    ecrirePropositions(id, propositions);
    // Une rédaction ratée ne doit pas effacer les suggestions du remplissage précédent.
    if (Object.keys(histoires).length > 0) ecrireSuggestions(id, suggestions);
    const enAttente = Object.entries(suggestions).filter(([cle, valeur]) => cle.includes(":") && propositions[cle] !== valeur).length;

    emettre({
      type: "done",
      resume: {
        captures: fichiers.size * langues.length - gardees,
        capturesGardees: gardees,
        videos: videos.posees.length,
        moments: captures.moments.length,
        logo: Boolean(logo),
        redaction,
        textesProposes: Object.keys(propositions).filter((cle) => cle.includes(":")).length,
        aEcrire: rejetes,
        suggestionsEnAttente: enAttente,
        marque: marque.sources,
        serie,
      },
    });
  } finally {
    await navigateur.close();
  }
}

principal().catch((erreur: unknown) => arreter(`Le site n'a pas pu être lu : ${(erreur as Error).message}`));
