import type { Langue, TextesDuFilm } from "../../../remotion/film/spec";
import type { MemoireDuSite } from "../site/memoire-du-site";
import { chiffreDuSite } from "../site/redaction-proposee";
import { type ChampAReecrire, ROLE_DE_LA_SECTION, type SectionDeLHistoire, champsDeLaSection } from "./sections";

/**
 * Réécrire UNE section de « Ton histoire » avec Claude : la demande, puis le
 * contrôle de la réponse. Module pur. Règle maison : rien d'inventé. Les
 * faits viennent de la mémoire du site ; sans elle, de la fiche seule, et
 * aucun chiffre n'est accepté (rien ne permet de le vérifier).
 */
export type DemandeDeReecriture = {
  marque: string;
  langue: Langue;
  section: SectionDeLHistoire;
  textes: TextesDuFilm;
  memoire: MemoireDuSite | null;
  consigne: string;
  aEviter: string[];
};

export type Reecriture = { ok: true; champs: Record<string, string>; aEcrireSoiMeme: string[] } | { ok: false; raison: string };

const LANGUES: Record<Langue, string> = { fr: "French", en: "English" };

export const CONSIGNE_MAX = 300;

export function demandeDeReecriture(d: DemandeDeReecriture): { systeme: string; message: string } {
  const champs = champsDeLaSection(d.section, d.textes);
  const systeme = [
    "You rewrite ONE section of the texts of a short brand film (motion design).",
    "Absolute rule: invent NOTHING. Every claim, product name and figure comes from the site content or the film texts provided.",
    "A figure must be written on the site; a price is never a figure. If there is none, answer null for that field.",
    "Tone: the site's. Very short, concrete sentences, no hollow superlatives, no exclamation marks.",
    `Write in ${LANGUES[d.langue]}. Respect each field's maximum length.`,
    'Answer with ONE JSON object and nothing else: {"champs": {"<key>": "<text>" | null}}',
  ].join("\n");
  const attendu = champs.map((c) => `- "${c.cle}" (${c.libelle}, ${c.max} characters max): ${c.consigne}. Current: « ${c.actuel} »`).join("\n");
  const site = d.memoire
    ? JSON.stringify({ adresse: d.memoire.url, nom: d.memoire.nomDuSite || d.memoire.titre, description: d.memoire.description, ...d.memoire.textes, pages: d.memoire.pages })
    : "(the site was never read: use only the film texts below, and answer null for any figure)";
  const autres = JSON.stringify({ probleme: d.textes.probleme.messages, bascule: d.textes.bascule, parcours: d.textes.parcours, moment: d.textes.evenement.chute, marque: d.textes.marque.mots, fin: d.textes.fin.disponible });
  const morceaux = [
    `Brand: ${d.marque}`,
    `Section to rewrite: ${ROLE_DE_LA_SECTION[d.section]}`,
    `Fields:\n${attendu}`,
    d.consigne ? `What the owner asks for this rewrite (follow it, within the rules): « ${d.consigne} »` : "",
    d.aEviter.length > 0 ? `Already proposed and rejected, write something different:\n${d.aEviter.map((t) => `- ${t}`).join("\n")}` : "",
    `The whole film, for consistency:\n${autres}`,
    `Site content:\n${site}`,
  ];
  return { systeme, message: morceaux.filter(Boolean).join("\n\n") };
}

function texteValide(valeur: unknown, max: number): string | null {
  if (typeof valeur !== "string") return null;
  const texte = valeur.replace(/\s+/g, " ").trim();
  return texte && texte.length <= max ? texte : null;
}

function accepte(champ: ChampAReecrire, valeur: unknown, memoire: MemoireDuSite | null): string | null {
  const texte = texteValide(valeur, champ.max);
  if (!texte) return null;
  // Vérifié par le code : un chiffre absent du site, ou un prix, est refusé.
  if (champ.cle === "bascule.chiffre") return memoire && chiffreDuSite(texte, memoire) && !/[€$£]/.test(texte) ? texte : null;
  return texte;
}

export function lireLaReecriture(d: Pick<DemandeDeReecriture, "section" | "textes" | "memoire">, brute: unknown): Reecriture {
  const racine = typeof brute === "object" && brute !== null ? (brute as Record<string, unknown>) : {};
  const recus = typeof racine.champs === "object" && racine.champs !== null ? (racine.champs as Record<string, unknown>) : {};
  const champs: Record<string, string> = {};
  const aEcrireSoiMeme: string[] = [];
  for (const champ of champsDeLaSection(d.section, d.textes)) {
    const texte = accepte(champ, recus[champ.cle], d.memoire);
    if (texte) champs[champ.cle] = texte;
    else aEcrireSoiMeme.push(champ.cle);
  }
  // Deux messages identiques : le film ferait doublon (il relance déjà le premier à la fin).
  const messages = Object.entries(champs).filter(([cle]) => cle.startsWith("probleme.messages."));
  if (new Set(messages.map(([, t]) => t.toLowerCase())).size !== messages.length) {
    return { ok: false, raison: "Claude a répété un message : relance." };
  }
  if (Object.keys(champs).length === 0) return { ok: false, raison: "Claude n'a rien proposé d'utilisable : relance, ou précise ta demande." };
  return { ok: true, champs, aEcrireSoiMeme };
}
