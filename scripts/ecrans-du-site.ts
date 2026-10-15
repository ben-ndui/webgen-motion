#!/usr/bin/env node
/**
 * « Tes écrans » avec Claude : deux gestes sur le site, qui demandent un
 * navigateur (donc un runner, comme remplir-film).
 *
 *   tsx scripts/ecrans-du-site.ts proposer --film-id <id> --url <adresse> --groupe parcours|moments|preuve [--eviter <url>]…
 *     Lit les pages du site, et Claude propose une page par case. Rien n'est écrit.
 *   tsx scripts/ecrans-du-site.ts filmer --film-id <id> --url <adresse> --groupe … --page <url> [--page <url>]…
 *     Filme les pages GARDÉES dans leurs cases et met la fiche à jour.
 *
 * Progression en NDJSON sur stdout : { type: "phase", label } … puis
 * { type: "done", choix } (proposer) ou { type: "done", resume } (filmer), ou { type: "error", message }.
 */
import { appelerClaude } from "../src/lib/cinema/scenario-claude";
import { resolveAgent } from "../src/lib/config-resolve";
import { enregistrerFilm } from "../src/lib/film-ecriture";
import { languesDuFilm } from "../src/lib/film-fiche-depart";
import { chargerFilm } from "../src/lib/film-loader";
import { estNomSur, getFilmPublicDir } from "../src/lib/film-store";
import { extractJsonBlock } from "../src/lib/llm-providers/anthropic";
import { GROUPES, type GroupeDEcrans, type PageDuSite, attentesDuGroupe, casesDuGroupe, demandeDeChoix, lireLeChoix } from "../src/lib/site/choix-des-pages";
import { filmerLesCases } from "../src/lib/site/filmer-les-cases";
import { lireLaPage } from "../src/lib/site/lecture-du-site";
import { lancerLeNavigateur, ouvrir } from "../src/lib/site/navigateur-du-site";
import { adresseLisible, liensUtiles, normaliserLAdresse } from "../src/lib/site/pages-du-site";
import { ecrirePropositions, lirePropositions } from "../src/lib/site/propositions-store";

function emettre(evenement: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify(evenement)}\n`);
}
const phase = (label: string) => emettre({ type: "phase", label });

function argument(drapeau: string): string | undefined {
  const i = process.argv.indexOf(drapeau);
  return i === -1 ? undefined : process.argv[i + 1];
}

function arguments_(drapeau: string): string[] {
  return process.argv.flatMap((valeur, i) => (process.argv[i - 1] === drapeau ? [valeur] : []));
}

function arreter(message: string): never {
  emettre({ type: "error", message });
  process.exit(1);
}

// Une erreur PENDANT que le navigateur tourne : on lève, pour que `finally`
// le ferme avant de sortir (process.exit le laisserait ouvert, invisible).
class Refus extends Error {}
function refuser(message: string): never {
  throw new Refus(message);
}

async function principal(): Promise<void> {
  const geste = process.argv[2];
  if (geste !== "proposer" && geste !== "filmer") arreter("Geste inconnu.");
  const id = argument("--film-id");
  if (!estNomSur(id)) arreter("Film invalide.");
  const url = normaliserLAdresse(argument("--url") ?? "");
  if (!url) arreter("Cette adresse ne ressemble pas à un site (exemple : monsite.fr).");
  const groupe = argument("--groupe") as GroupeDEcrans;
  if (!GROUPES.includes(groupe)) arreter("Groupe d'écrans inconnu.");
  const fiche = chargerFilm(id);
  if (!fiche) arreter("Film introuvable.");
  if (fiche.etat === "invalide") arreter("La fiche du film a des erreurs : corrige-les d'abord.");
  const spec = fiche.spec;
  const langues = languesDuFilm(spec);

  phase(`Ouverture de ${adresseLisible(url)}…`);
  const navigateur = await lancerLeNavigateur();
  try {
    if (geste === "proposer") {
      const agent = resolveAgent();
      if (!agent || agent.provider !== "anthropic") refuser("Il faut une clé Claude (Anthropic) dans les Réglages pour te faire aider.");
      const accueil = await ouvrir(navigateur, url, "ordinateur");
      const lecture = await lireLaPage(accueil);
      await accueil.close();
      const pages: PageDuSite[] = [];
      for (const page of [{ url, titre: "Accueil" }, ...liensUtiles(lecture.liens).map((l) => ({ url: l.url, titre: l.texte || new URL(l.url).pathname }))]) {
        // Le même lien deux fois (menu et pied de page) : une seule ligne pour Claude.
        if (!pages.some((p) => p.url.replace(/\/$/, "") === page.url.replace(/\/$/, "")) && pages.length < 30) pages.push(page);
      }
      phase("Claude choisit les pages…");
      const nombre = casesDuGroupe(spec, groupe);
      const { systeme, message } = demandeDeChoix(spec.marque.nom ?? adresseLisible(url), pages, attentesDuGroupe(spec, langues[0]!, groupe), arguments_("--eviter"));
      const reponse = await appelerClaude(agent, systeme, message);
      if (!reponse.ok) refuser(reponse.raison);
      let json: unknown;
      try {
        json = JSON.parse(extractJsonBlock(reponse.texte));
      } catch {
        refuser("La réponse de Claude n'était pas lisible : relance.");
      }
      const lu = lireLeChoix(groupe, pages, nombre, json);
      if (!lu.ok) refuser(lu.raison);
      emettre({ type: "done", choix: lu.choix });
      return;
    }

    const urls = arguments_("--page").map((u) => normaliserLAdresse(u)).filter((u): u is string => u !== null);
    if (urls.length === 0) refuser("Aucune page à filmer.");
    const resultat = await filmerLesCases(navigateur, spec, groupe, urls, langues, getFilmPublicDir(id), phase);
    if (!resultat.ok) refuser(resultat.raison);
    const ecriture = enregistrerFilm(id, spec);
    if (!ecriture.ok) refuser(ecriture.raison);
    // Posées par GEN MOTION : un prochain « Remplir depuis le site » pourra les remplacer.
    const propositions = lirePropositions(id);
    for (const relatif of resultat.posees) propositions[`capture:${relatif}`] = relatif;
    ecrirePropositions(id, propositions);
    emettre({ type: "done", resume: { posees: resultat.posees.length, echecs: resultat.echecs, moments: resultat.moments } });
  } finally {
    await navigateur.close();
  }
}

principal().catch((erreur: unknown) =>
  arreter(erreur instanceof Refus ? erreur.message : `Le site n'a pas pu être lu : ${(erreur as Error).message}`),
);
