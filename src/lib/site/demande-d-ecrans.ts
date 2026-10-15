import { GROUPES, type GroupeDEcrans } from "./choix-des-pages";
import { normaliserLAdresse } from "./pages-du-site";

/**
 * La demande de l'écran « Tes écrans », lue et bornée avant de lancer un
 * navigateur : proposer (Claude choisit) ou filmer (les pages gardées).
 * Module pur : les arguments du runner en sortent tout prêts.
 */
export type DemandeDEcrans =
  | { geste: "proposer"; url: string; groupe: GroupeDEcrans; aEviter: string[] }
  | { geste: "filmer"; url: string; groupe: GroupeDEcrans; pages: string[] };

// Quatre étapes de parcours au plus ; cinq propositions écartées au plus.
const PAGES_MAX = 4;
const ECARTEES_MAX = 5;

const adresses = (v: unknown, max: number): string[] =>
  (Array.isArray(v) ? v : []).map((u) => (typeof u === "string" ? normaliserLAdresse(u) : null)).filter((u): u is string => u !== null).slice(0, max);

export function lireLaDemandeDEcrans(brute: unknown): DemandeDEcrans | { erreur: string } {
  if (typeof brute !== "object" || brute === null) return { erreur: "Requête illisible" };
  const d = brute as Record<string, unknown>;
  const url = typeof d.url === "string" ? normaliserLAdresse(d.url) : null;
  if (!url) return { erreur: "Cette adresse ne ressemble pas à un site (exemple : monsite.fr)" };
  const groupe = d.groupe as GroupeDEcrans;
  if (!GROUPES.includes(groupe)) return { erreur: "Groupe d'écrans inconnu" };
  if (d.geste === "proposer") return { geste: "proposer", url, groupe, aEviter: adresses(d.aEviter, ECARTEES_MAX) };
  if (d.geste === "filmer") {
    const pages = adresses(d.pages, PAGES_MAX);
    if (pages.length === 0) return { erreur: "Aucune page à filmer" };
    return { geste: "filmer", url, groupe, pages };
  }
  return { erreur: "Geste inconnu" };
}

export function argumentsDuRunner(id: string, demande: DemandeDEcrans): string[] {
  const base = [demande.geste, "--film-id", id, "--url", demande.url, "--groupe", demande.groupe];
  if (demande.geste === "proposer") return [...base, ...demande.aEviter.flatMap((u) => ["--eviter", u])];
  return [...base, ...demande.pages.flatMap((u) => ["--page", u])];
}
