import type { FilmSpec, Langue } from "../../../remotion/film/spec";

/**
 * Claude choisit quelle page du site filmer pour chaque case de « Tes
 * écrans ». Module pur : la demande (les pages du site, numérotées, et ce
 * que chaque case doit montrer selon l'histoire) et la lecture de la réponse.
 * Claude ne cite QUE des pages de la liste : il ne peut pas inventer une adresse.
 */
export const GROUPES = ["parcours", "moments", "preuve"] as const;
export type GroupeDEcrans = (typeof GROUPES)[number];

export type PageDuSite = { url: string; titre: string };
export type CaseChoisie = { case: number; url: string; titre: string; raison: string };
export type ChoixDesPages = { groupe: GroupeDEcrans; cases: CaseChoisie[]; pages: PageDuSite[] };

/** Ce que chaque case doit montrer, d'après l'histoire du film. */
export function attentesDuGroupe(fiche: FilmSpec, langue: Langue, groupe: GroupeDEcrans): string[] {
  const t = fiche.textes[langue];
  if (groupe === "parcours") return t.parcours.slice(0, fiche.ecrans.parcours.length).map((legende, i) => `Step ${i + 1} of the user journey, captioned "${legende}"`);
  if (groupe === "moments") return [`ONE page whose content changes as you scroll, to show the key moment "${t.evenement.chute}" in ${fiche.ecrans.evenement.length} successive states`];
  return [`The page that PROVES the brand promise (${t.marque.mots.join(", ")}): an order, a booking, a contact form, a result`];
}

export function demandeDeChoix(
  marque: string,
  pages: PageDuSite[],
  attentes: string[],
  aEviter: string[] = [],
): { systeme: string; message: string } {
  const systeme = [
    "You pick which pages of a website to film for a short brand video, one page per slot.",
    "Rules:",
    "- Only use pages from the numbered list: answer with their number. Never invent a page.",
    "- Pick the page that best SHOWS what the slot asks for, as a visitor would see it on a phone.",
    "- Do not use the same page twice unless the list is too short.",
    "- The reason is one short sentence in FRENCH, addressed to the site owner (tutoiement).",
    'Answer with ONE JSON object and nothing else: {"cases": [{"case": slot number, "page": page number, "raison": string}]}',
  ].join("\n");
  const liste = pages.map((p, i) => `${i + 1}. ${p.titre} — ${p.url}`).join("\n");
  const cases = attentes.map((a, i) => `Slot ${i + 1}: ${a}`).join("\n");
  const ecartees = aEviter.length > 0 ? `\n\nAlready proposed and rejected by the user, choose differently where you can:\n${aEviter.map((u) => `- ${u}`).join("\n")}` : "";
  return { systeme, message: `Brand: ${marque}\n\nPages of the site:\n${liste}\n\nSlots to fill:\n${cases}${ecartees}` };
}

type Objet = Record<string, unknown>;
const estObjet = (v: unknown): v is Objet => typeof v === "object" && v !== null && !Array.isArray(v);

export function lireLeChoix(groupe: GroupeDEcrans, pages: PageDuSite[], nombreDeCases: number, reponse: unknown): { ok: true; choix: ChoixDesPages } | { ok: false; raison: string } {
  if (!estObjet(reponse) || !Array.isArray(reponse.cases)) return { ok: false, raison: "La réponse de Claude n'était pas lisible : relance." };
  const cases: CaseChoisie[] = [];
  for (const brute of reponse.cases.filter(estObjet)) {
    const numero = Number(brute.case);
    const page = pages[Number(brute.page) - 1];
    if (!Number.isInteger(numero) || numero < 1 || numero > nombreDeCases || !page) continue;
    if (cases.some((c) => c.case === numero - 1)) continue;
    cases.push({ case: numero - 1, url: page.url, titre: page.titre, raison: typeof brute.raison === "string" ? brute.raison.trim().slice(0, 300) : "" });
  }
  if (cases.length < nombreDeCases) return { ok: false, raison: `Claude n'a pas proposé de page pour chaque case (${cases.length} sur ${nombreDeCases}) : relance.` };
  cases.sort((a, b) => a.case - b.case);
  return { ok: true, choix: { groupe, cases, pages } };
}

/** Le nombre de pages à choisir : une par case du parcours, une seule sinon. */
export function casesDuGroupe(fiche: FilmSpec, groupe: GroupeDEcrans): number {
  return groupe === "parcours" ? fiche.ecrans.parcours.length : 1;
}
