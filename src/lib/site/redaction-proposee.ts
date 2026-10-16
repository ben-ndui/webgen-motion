import type { Langue } from "../../../remotion/film/spec";
import type { LectureDuSite } from "./lecture-du-site";

/**
 * Ce que Claude propose pour « Ton histoire », et le contrôle de ce qu'il
 * rend. Module pur : la demande, puis la lecture de la réponse. Règle maison :
 * rien d'inventé. Le prompt le demande ET le code le vérifie (un chiffre
 * dont les nombres ne figurent pas sur le site est refusé).
 */
export type MessagePropose = { auteur: "moi" | "autre"; texte: string };

export type HistoireProposee = Partial<{
  conversation: MessagePropose[];
  constat: string;
  chiffre: string;
  promesse: string;
  // Une case peut manquer (texte refusé) : elle reste « à écrire ».
  parcours: (string | undefined)[];
  momentCle: string;
  troisMots: (string | undefined)[];
  ouTrouver: string;
  motSignature: string;
  anneau: string;
  legendes: (string | undefined)[];
  signature: string;
}>;

// Les longueurs que l'assistant conseille : au-delà, le texte déborde du plan.
export const LONGUEURS = {
  message: 40, constat: 40, chiffre: 40, promesse: 60, parcours: 24, momentCle: 40,
  troisMots: 18, ouTrouver: 50, motSignature: 14, anneau: 48, legendes: 24, signature: 50,
} as const;

const NOMS_DES_LANGUES: Record<Langue, string> = { fr: "français", en: "anglais" };

/**
 * `ecrans` : les pages réellement capturées pour le parcours, DANS L'ORDRE
 * du film (l'accueil d'abord). Sans elles, Claude légendait le menu et les
 * légendes se décalaient d'un écran (constaté le 12/10/2026).
 */
export function demandeDeRedaction(lecture: LectureDuSite, langues: Langue[], ecrans: string[] = []): { systeme: string; message: string } {
  const ordre = ecrans.length > 0 ? ` Les écrans sont, dans cet ordre : ${ecrans.map((e) => `« ${e} »`).join(", ")} : une légende par écran, dans le même ordre.` : "";
  const systeme = [
    "Tu écris les textes d'un court film de présentation (motion design) pour une marque, à partir de son site.",
    "Règle absolue : n'invente RIEN. Chaque affirmation, chaque nom de produit, chaque chiffre vient du contenu fourni.",
    "Si une information manque (par exemple aucun chiffre sur le site), mets null : la personne l'écrira elle-même.",
    "Ton : celui du site. Phrases très courtes, concrètes, sans superlatif creux ni point d'exclamation.",
    "Réponds UNIQUEMENT par un objet JSON, sans texte autour.",
  ].join("\n");
  const schema = {
    conversation: `2 ou 3 messages DIFFÉRENTS {auteur: "moi"|"autre", texte} d'une conversation de téléphone entre deux proches, qui MONTRE le problème que la marque règle (la marque n'y parle pas) ; ne répète pas le 1er message, le film le fait revenir tout seul à la fin ; ${LONGUEURS.message} caractères max chacun`,
    constat: `ce qui se passe aujourd'hui pour le client, ${LONGUEURS.constat} car. max`,
    chiffre: `un chiffre frappant PRIS SUR LE SITE (liste « chiffres » fournie) qui dit l'ampleur ou la qualité (clients, années, pourcentage), JAMAIS un prix ; ${LONGUEURS.chiffre} car. max, ou null`,
    promesse: `la promesse de la marque en une phrase, ${LONGUEURS.promesse} car. max`,
    parcours: `4 légendes de 2 à 3 mots, une par écran du parcours, ${LONGUEURS.parcours} car. max.${ordre}`,
    momentCle: `ce que ça change pour le client, une phrase, ${LONGUEURS.momentCle} car. max`,
    troisMots: `3 mots ou très courtes phrases qui résument la marque, ${LONGUEURS.troisMots} car. max chacun`,
    ouTrouver: `où trouver la marque (l'adresse du site par exemple), ${LONGUEURS.ouTrouver} car. max`,
    motSignature: `UN mot qui résume la marque, terminé par un point, ${LONGUEURS.motSignature} car. max`,
    anneau: `trois mots séparés par « · », ${LONGUEURS.anneau} car. max`,
    legendes: `4 légendes de 2 à 4 mots, une par écran du parcours (les mêmes écrans), ${LONGUEURS.legendes} car. max`,
    signature: `une ligne sous le logo, ${LONGUEURS.signature} car. max`,
  };
  const message = [
    `Langues à rédiger : ${langues.map((l) => `${l} (${NOMS_DES_LANGUES[l]})`).join(", ")}.`,
    `Forme attendue : { ${langues.map((l) => `"${l}": {…}`).join(", ")} }, chaque langue avec ces champs :`,
    JSON.stringify(schema, null, 2),
    "Contenu du site :",
    JSON.stringify({
      adresse: lecture.url,
      nom: lecture.nomDuSite || lecture.titre,
      description: lecture.description,
      titres: lecture.textes.titres,
      paragraphes: lecture.textes.paragraphes,
      boutons: lecture.textes.boutons,
      chiffres: lecture.textes.chiffres,
      pages: lecture.liens.filter((l) => l.dansLeMenu).map((l) => l.texte).filter(Boolean),
    }),
  ].join("\n\n");
  return { systeme, message };
}

function texteValide(valeur: unknown, max: number): string | null {
  if (typeof valeur !== "string") return null;
  const t = valeur.replace(/\s+/g, " ").trim();
  return t && t.length <= max ? t : null;
}

/**
 * Une liste case par case : un texte refusé n'emporte pas les autres. `null`
 * si aucune case n'est utilisable.
 */
function listeValide(valeur: unknown, nombre: number, max: number): (string | undefined)[] | null {
  if (!Array.isArray(valeur)) return null;
  const textes = Array.from({ length: nombre }, (_, i) => texteValide(valeur[i], max) ?? undefined);
  return textes.some((t) => t !== undefined) ? textes : null;
}

/** Tous les nombres d'un texte sont-ils écrits quelque part sur le site ? */
// Seuls la description et les textes comptent : la mémoire du site suffit (réécriture d'une section).
export function chiffreDuSite(chiffre: string, lecture: Pick<LectureDuSite, "description" | "textes">): boolean {
  const nombres = chiffre.match(/\d+(?:[.,]\d+)?/g) ?? [];
  if (nombres.length === 0) return false;
  const site = [lecture.description, ...lecture.textes.titres, ...lecture.textes.paragraphes, ...lecture.textes.chiffres]
    .join(" ")
    .replace(/(\d)\s(?=\d{3}\b)/g, "$1");
  return nombres.every((n) => site.includes(n));
}

export type LectureDeLaReponse = { histoires: Partial<Record<Langue, HistoireProposee>>; rejetes: string[] };

export function lireLaReponse(brute: unknown, langues: Langue[], lecture: LectureDuSite): LectureDeLaReponse {
  const histoires: Partial<Record<Langue, HistoireProposee>> = {};
  const rejetes: string[] = [];
  const racine = typeof brute === "object" && brute !== null ? (brute as Record<string, unknown>) : {};
  for (const langue of langues) {
    const r = typeof racine[langue] === "object" && racine[langue] !== null ? (racine[langue] as Record<string, unknown>) : {};
    const h: HistoireProposee = {};
    const garder = <K extends keyof HistoireProposee>(cle: K, valeur: HistoireProposee[K] | null) => {
      if (valeur === null || valeur === undefined) rejetes.push(`${langue}.${cle}`);
      else h[cle] = valeur;
    };
    const messages = Array.isArray(r.conversation)
      ? r.conversation
          .map((m) => (typeof m === "object" && m !== null ? (m as Record<string, unknown>) : {}))
          .map((m) => ({ auteur: m.auteur === "autre" ? ("autre" as const) : ("moi" as const), texte: texteValide(m.texte, LONGUEURS.message) }))
      : [];
    // Un message répété ferait doublon avec la relance que le film ajoute seul.
    const distincts = new Set(messages.map((m) => m.texte?.toLowerCase())).size === messages.length;
    garder("conversation", messages.length >= 2 && messages.length <= 4 && distincts && messages.every((m) => m.texte) ? (messages as MessagePropose[]) : null);
    garder("constat", texteValide(r.constat, LONGUEURS.constat));
    const chiffre = texteValide(r.chiffre, LONGUEURS.chiffre);
    // Vérifié par le code, pas seulement demandé : un chiffre absent du site, ou un prix, est refusé.
    garder("chiffre", chiffre && chiffreDuSite(chiffre, lecture) && !/[€$£]/.test(chiffre) ? chiffre : null);
    garder("promesse", texteValide(r.promesse, LONGUEURS.promesse));
    garder("parcours", listeValide(r.parcours, 4, LONGUEURS.parcours));
    garder("momentCle", texteValide(r.momentCle, LONGUEURS.momentCle));
    garder("troisMots", listeValide(r.troisMots, 3, LONGUEURS.troisMots));
    garder("ouTrouver", texteValide(r.ouTrouver, LONGUEURS.ouTrouver));
    garder("motSignature", texteValide(r.motSignature, LONGUEURS.motSignature));
    const anneau = texteValide(r.anneau, LONGUEURS.anneau);
    garder("anneau", anneau && anneau.length >= 8 ? anneau : null);
    garder("legendes", listeValide(r.legendes, 4, LONGUEURS.legendes));
    garder("signature", texteValide(r.signature, LONGUEURS.signature));
    histoires[langue] = h;
  }
  return { histoires, rejetes };
}
