// Validation de la fiche du film, AVANT le premier plan. Fonction pure : elle
// ne lit ni fichier ni réseau, elle dit tout ce qui ne va pas d'un coup,
// avec le chemin du champ (« textes.en.parcours »), pour qu'une fiche écrite à
// la main ou produite en JSON se corrige en un seul passage.
//
// Ce qu'elle ne peut pas savoir, et que d'autres vérifient : que les captures
// existent dans public/ (scripts/avant-rendu.mjs), que la police existe chez
// Google Fonts (le rendu s'arrête avec son nom), qu'un chiffre est vrai (le
// test de l'app qui le calcule).
//
// Ce fichier n'importe que des types : Node le lit tel quel (avant-rendu.mjs).
import type { FilmSpec } from "./spec";

type Objet = Record<string, unknown>;

const LANGUES = ["fr", "en"] as const;
const COULEURS = ["encre", "clair", "accent", "accentSurClair", "accentSurSombre", "bulleRecue"] as const;
const HEXADECIMAL = /^#[0-9a-f]{6}$/i;

export function estObjet(valeur: unknown): valeur is Objet {
  return typeof valeur === "object" && valeur !== null && !Array.isArray(valeur);
}

export function estTexte(valeur: unknown): valeur is string {
  return typeof valeur === "string" && valeur.trim().length > 0;
}

export function estNombre(valeur: unknown): valeur is number {
  return typeof valeur === "number" && Number.isFinite(valeur);
}

// Chaque vérification ajoute ses erreurs à la liste, avec le chemin du champ.
export type Erreurs = string[];

export function texte(erreurs: Erreurs, chemin: string, valeur: unknown): void {
  if (!estTexte(valeur)) erreurs.push(`${chemin} : texte non vide attendu`);
}

export function textes(erreurs: Erreurs, chemin: string, valeur: unknown, nombre?: number): void {
  if (!Array.isArray(valeur)) {
    erreurs.push(`${chemin} : liste attendue`);
    return;
  }
  if (nombre !== undefined && valeur.length !== nombre) {
    erreurs.push(`${chemin} : ${nombre} éléments attendus, ${valeur.length} reçus`);
  }
  valeur.forEach((element, index) => texte(erreurs, `${chemin}[${index}]`, element));
}

function verifierAppareil(erreurs: Erreurs, appareil: unknown): void {
  if (appareil === undefined) return;
  if (!estObjet(appareil) || !["telephone", "ordinateur"].includes(appareil.type as string)) {
    erreurs.push("marque.appareil.type : « telephone » ou « ordinateur »");
    return;
  }
  if (appareil.type === "ordinateur" && !(estNombre(appareil.rapport) && appareil.rapport > 0)) {
    erreurs.push("marque.appareil.rapport : nombre positif attendu (hauteur / largeur des captures)");
  }
}

function verifierMarque(erreurs: Erreurs, marque: unknown): void {
  if (!estObjet(marque)) {
    erreurs.push("marque : objet attendu");
    return;
  }
  const couleurs = estObjet(marque.couleurs) ? marque.couleurs : {};
  for (const role of COULEURS) {
    const valeur = couleurs[role];
    if (typeof valeur !== "string" || !HEXADECIMAL.test(valeur)) {
      erreurs.push(`marque.couleurs.${role} : couleur #RRGGBB attendue`);
    }
  }
  texte(erreurs, "marque.police", marque.police);
  texte(erreurs, "marque.ombreTelephone", marque.ombreTelephone);
  if (typeof marque.contact !== "string") erreurs.push("marque.contact : texte attendu");
  if (marque.nom !== undefined && typeof marque.nom !== "string") erreurs.push("marque.nom : texte attendu");
  verifierLogo(erreurs, marque.logo);
  verifierAppareil(erreurs, marque.appareil);
}

function verifierLogo(erreurs: Erreurs, logo: unknown): void {
  if (!estObjet(logo)) {
    erreurs.push("marque.logo : objet attendu");
    return;
  }
  if (logo.type === "motSymbole") {
    texte(erreurs, "marque.logo.texte", logo.texte);
    if (![400, 500, 600].includes(logo.graisse as number)) erreurs.push("marque.logo.graisse : 400, 500 ou 600");
    if (!estNombre(logo.approche)) erreurs.push("marque.logo.approche : nombre attendu");
    return;
  }
  if (logo.type === "glyphe") {
    textes(erreurs, "marque.logo.traces", logo.traces);
    if (Array.isArray(logo.traces) && logo.traces.length === 0) erreurs.push("marque.logo.traces : au moins un tracé");
    texte(erreurs, "marque.logo.logotype", logo.logotype);
    if (![300, 400, 500].includes(logo.graisseDuLogotype as number)) {
      erreurs.push("marque.logo.graisseDuLogotype : 300, 400 ou 500");
    }
    if (!estNombre(logo.espacementDuLogotype)) erreurs.push("marque.logo.espacementDuLogotype : nombre attendu");
    return;
  }
  if (logo.type === "image") {
    texte(erreurs, "marque.logo.fichier", logo.fichier);
    if (!estNombre(logo.rapport) || logo.rapport <= 0) erreurs.push("marque.logo.rapport : largeur / hauteur, positif");
    if (typeof logo.inverser !== "boolean") erreurs.push("marque.logo.inverser : vrai ou faux");
    return;
  }
  erreurs.push("marque.logo.type : « motSymbole », « glyphe » ou « image »");
}

function verifierTextes(erreurs: Erreurs, tous: unknown): void {
  if (!estObjet(tous)) {
    erreurs.push("textes : objet attendu, une entrée par langue");
    return;
  }
  for (const langue of LANGUES) {
    const chemin = `textes.${langue}`;
    const t = tous[langue];
    if (!estObjet(t)) {
      erreurs.push(`${chemin} : manquant`);
      continue;
    }
    texte(erreurs, `${chemin}.dossierDesEcrans`, t.dossierDesEcrans);
    const probleme = estObjet(t.probleme) ? t.probleme : {};
    texte(erreurs, `${chemin}.probleme.heure`, probleme.heure);
    const messages = Array.isArray(probleme.messages) ? probleme.messages : [];
    if (messages.length === 0) erreurs.push(`${chemin}.probleme.messages : au moins un message`);
    messages.forEach((message: unknown, index: number) => {
      const m = estObjet(message) ? message : {};
      if (m.auteur !== "moi" && m.auteur !== "autre") {
        erreurs.push(`${chemin}.probleme.messages[${index}].auteur : « moi » ou « autre »`);
      }
      texte(erreurs, `${chemin}.probleme.messages[${index}].texte`, m.texte);
    });
    const bascule = estObjet(t.bascule) ? t.bascule : {};
    for (const champ of ["constat", "chiffre", "signature"]) texte(erreurs, `${chemin}.bascule.${champ}`, bascule[champ]);
    textes(erreurs, `${chemin}.parcours`, t.parcours, 4);
    texte(erreurs, `${chemin}.evenement.chute`, estObjet(t.evenement) ? t.evenement.chute : undefined);
    textes(erreurs, `${chemin}.marque.mots`, estObjet(t.marque) ? t.marque.mots : undefined, 3);
    texte(erreurs, `${chemin}.fin.disponible`, estObjet(t.fin) ? t.fin.disponible : undefined);
    if (!estObjet(t.apercu)) erreurs.push(`${chemin}.apercu : objet attendu (vide s'il n'y a pas d'aperçu)`);
  }
}

function verifierEcrans(erreurs: Erreurs, ecrans: unknown): void {
  if (!estObjet(ecrans)) {
    erreurs.push("ecrans : objet attendu");
    return;
  }
  textes(erreurs, "ecrans.parcours", ecrans.parcours, 4);
  textes(erreurs, "ecrans.evenement", ecrans.evenement);
  if (Array.isArray(ecrans.evenement) && ecrans.evenement.length < 2) {
    erreurs.push("ecrans.evenement : au moins deux états, sinon rien ne bascule");
  }
  // Le plan dure quatre mesures, un état par mesure : un cinquième ne se
  // verrait jamais, et la phrase de chute non plus.
  if (Array.isArray(ecrans.evenement) && ecrans.evenement.length > 4) {
    erreurs.push(`ecrans.evenement : quatre états au plus (le plan dure quatre mesures), ${ecrans.evenement.length} reçus`);
  }
  texte(erreurs, "ecrans.marque", ecrans.marque);
}

function verifierMusique(erreurs: Erreurs, musique: unknown): void {
  if (!estObjet(musique)) {
    erreurs.push("musique : objet attendu");
    return;
  }
  for (const champ of ["fichier", "titre", "source"]) texte(erreurs, `musique.${champ}`, musique[champ]);
  // Hors de cette fourchette, l'analyseur a sans doute répondu le double ou
  // la moitié du vrai tempo.
  if (!estNombre(musique.tempo) || musique.tempo < 60 || musique.tempo > 200) {
    erreurs.push("musique.tempo : entre 60 et 200 BPM (mesuré par npm run musique)");
  }
  if (!estNombre(musique.premierTemps) || musique.premierTemps < 0) {
    erreurs.push("musique.premierTemps : nombre de secondes positif ou nul");
  }
  if (musique.volume !== undefined && (!estNombre(musique.volume) || musique.volume < 0 || musique.volume > 1)) {
    erreurs.push("musique.volume : de 0 à 1");
  }
}

function verifierDeclinaisons(erreurs: Erreurs, declinaisons: unknown): void {
  if (!Array.isArray(declinaisons) || declinaisons.length === 0) {
    erreurs.push("declinaisons : au moins un livrable");
    return;
  }
  const noms = new Set<unknown>();
  declinaisons.forEach((declinaison: unknown, index: number) => {
    const chemin = `declinaisons[${index}]`;
    const d = estObjet(declinaison) ? declinaison : {};
    texte(erreurs, `${chemin}.nom`, d.nom);
    if (noms.has(d.nom)) erreurs.push(`${chemin}.nom : « ${String(d.nom)} » est déjà pris`);
    noms.add(d.nom);
    if (!LANGUES.includes(d.langue as "fr")) erreurs.push(`${chemin}.langue : « fr » ou « en »`);
    if (d.version !== "long" && d.version !== "court") erreurs.push(`${chemin}.version : « long » ou « court »`);
    if (typeof d.avecContact !== "boolean") erreurs.push(`${chemin}.avecContact : vrai ou faux`);
  });
}

function verifierApercu(erreurs: Erreurs, apercu: unknown, tous: unknown): void {
  if (!estObjet(apercu)) {
    erreurs.push("apercu : objet attendu, une liste (éventuellement vide) par langue");
    return;
  }
  for (const langue of LANGUES) {
    const plans = apercu[langue];
    if (!Array.isArray(plans)) {
      erreurs.push(`apercu.${langue} : liste attendue`);
      continue;
    }
    const legendes = estObjet(tous) && estObjet(tous[langue]) && estObjet(tous[langue].apercu) ? tous[langue].apercu : {};
    plans.forEach((plan: unknown, index: number) => {
      const chemin = `apercu.${langue}[${index}]`;
      const p = estObjet(plan) ? plan : {};
      texte(erreurs, `${chemin}.id`, p.id);
      texte(erreurs, `${chemin}.prise`, p.prise);
      if (!estNombre(p.mesures) || p.mesures <= 0) erreurs.push(`${chemin}.mesures : nombre positif`);
      if (!estNombre(p.debut) || !estNombre(p.fin) || p.fin <= p.debut) {
        erreurs.push(`${chemin} : debut et fin en secondes, fin après debut`);
      }
      if (estTexte(p.id) && !estTexte(legendes[p.id])) {
        erreurs.push(`textes.${langue}.apercu.${p.id} : légende manquante`);
      }
    });
  }
}

// Les repères qu'une voix peut prendre (reperes.ts). Écrits ici et non
// importés : ce fichier n'importe que des types. Le test vérifie qu'ils
// couvrent exactement les repères du film.
export const REPERE_DE_VOIX =
  /^(ouverture\.nom|probleme\.messages\.\d|bascule\.(constat|chiffre|signature)|parcours\.[0-3]|evenement\.chute|marque\.mots\.[0-2]|fin\.disponible)$/;

function verifierVoix(erreurs: Erreurs, voix: unknown): void {
  if (voix === undefined) return;
  if (!estObjet(voix)) {
    erreurs.push("voix : objet attendu");
    return;
  }
  if (voix.genre !== undefined && voix.genre !== "feminin" && voix.genre !== "masculin") {
    erreurs.push("voix.genre : « feminin » ou « masculin »");
  }
  if (!estNombre(voix.musiqueSousLaVoix) || voix.musiqueSousLaVoix < 0 || voix.musiqueSousLaVoix > 1) {
    erreurs.push("voix.musiqueSousLaVoix : de 0 à 1");
  }
  const lignes = estObjet(voix.lignes) ? voix.lignes : {};
  for (const langue of LANGUES) {
    const liste = lignes[langue];
    if (liste === undefined) continue;
    if (!Array.isArray(liste)) {
      erreurs.push(`voix.lignes.${langue} : liste attendue`);
      continue;
    }
    const vus = new Set<unknown>();
    liste.forEach((ligne: unknown, index: number) => {
      const chemin = `voix.lignes.${langue}[${index}]`;
      const l = estObjet(ligne) ? ligne : {};
      if (typeof l.repere !== "string" || !REPERE_DE_VOIX.test(l.repere)) erreurs.push(`${chemin}.repere : repère inconnu « ${String(l.repere)} »`);
      if (vus.has(l.repere)) erreurs.push(`${chemin}.repere : « ${String(l.repere)} » a déjà une réplique`);
      vus.add(l.repere);
      texte(erreurs, `${chemin}.texte`, l.texte);
      if (l.fichier !== undefined) texte(erreurs, `${chemin}.fichier`, l.fichier);
      if (l.duree !== undefined && (!estNombre(l.duree) || l.duree <= 0)) erreurs.push(`${chemin}.duree : secondes, positif`);
    });
  }
}

/**
 * Produit sur ordinateur : le problème se joue dans une boîte de réception, dont
 * le titre et chaque expéditeur s'écrivent dans la langue du film (aucun texte
 * par défaut dans le composant, sinon le film anglais afficherait du français).
 */
function verifierBoiteDeReception(erreurs: Erreurs, marque: unknown, tous: unknown): void {
  if (!estObjet(marque) || !estObjet(marque.appareil) || marque.appareil.type !== "ordinateur") return;
  if (!estObjet(tous)) return;
  for (const langue of LANGUES) {
    const t = tous[langue];
    const probleme = estObjet(t) && estObjet(t.probleme) ? t.probleme : {};
    texte(erreurs, `textes.${langue}.probleme.titreDeLaBoite`, probleme.titreDeLaBoite);
    const messages = Array.isArray(probleme.messages) ? probleme.messages : [];
    messages.forEach((message: unknown, index: number) => {
      texte(erreurs, `textes.${langue}.probleme.messages[${index}].expediteur`, estObjet(message) ? message.expediteur : undefined);
    });
  }
}

/** Toutes les erreurs de la fiche ; liste vide = fiche valide. */
export function erreursDeLaSpec(entree: unknown): string[] {
  const erreurs: Erreurs = [];
  if (!estObjet(entree)) return ["la fiche du film doit être un objet"];
  if (typeof entree.exemple !== "boolean") erreurs.push("exemple : vrai ou faux");
  verifierMarque(erreurs, entree.marque);
  verifierTextes(erreurs, entree.textes);
  verifierBoiteDeReception(erreurs, entree.marque, entree.textes);
  verifierEcrans(erreurs, entree.ecrans);
  verifierMusique(erreurs, entree.musique);
  verifierDeclinaisons(erreurs, entree.declinaisons);
  verifierApercu(erreurs, entree.apercu, entree.textes);
  verifierVoix(erreurs, entree.voix);
  // Liste écrite ici et non importée de spec.ts : ce fichier n'importe que des
  // types (Node le lit tel quel). Le test vérifie qu'elle reste identique.
  const directions = ["marque", "editorial", "nocturne"];
  if (entree.direction !== undefined && !directions.includes(entree.direction as string)) {
    erreurs.push(`direction : l'une de ${directions.join(", ")} (reçu « ${String(entree.direction)} »)`);
  }
  return erreurs;
}

/** La fiche, typée, si elle est valide ; sinon une erreur qui liste TOUT. */
export function validerSpec(entree: unknown): FilmSpec {
  const erreurs = erreursDeLaSpec(entree);
  if (erreurs.length > 0) {
    throw new Error(`Fiche du film invalide (${erreurs.length}) :\n  - ${erreurs.join("\n  - ")}`);
  }
  return entree as FilmSpec;
}
