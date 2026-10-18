// CALER LES PAROLES : les mots écrits par l'artiste (la vérité) reçoivent les
// horodatages que whisper a entendus (le chronomètre). Whisper se trompe sur
// des mots (« sans froid » pour « sans frein ») mais rarement sur le MOMENT où
// ils sont chantés : on garde son temps, jamais son texte.
//
// Méthode : on aligne les deux suites de mots (normalisés) par la plus longue
// sous-suite commune ; un mot de l'artiste reconnu prend le temps de son
// jumeau, un mot non reconnu est réparti entre ses voisins reconnus.
//
// Ce fichier n'importe rien : Node le lit tel quel (scripts/caler-paroles.mjs).

export type MotEntendu = { texte: string; debut: number; fin: number };
export type MotCale = { texte: string; debut: number; fin: number };
export type LigneCalee = { mots: MotCale[] };

/** « L'époque, » → « lepoque » : ni casse, ni accent, ni ponctuation. */
export function normaliser(mot: string): string {
  return mot
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Les marqueurs que whisper invente sur la musique : « *Musique* », « [Applaudissements] », « ♪ ». */
export function estUnMarqueur(texte: string): boolean {
  const t = texte.trim();
  return t === "" || /^[*[(♪].*[*\])♪]$/.test(t) || t === "♪";
}

/**
 * Le texte tel que l'artiste l'écrit → les lignes CHANTÉES. Les repères de
 * section (« [ Refrain ] », « (Couplet) »), les lignes vides et la virgule de
 * fin de ligne ne s'affichent pas : on les retire avant le calage, sans
 * toucher au reste (ponctuation interne, majuscules, apostrophes).
 */
export function lignesChantees(texte: string): string[] {
  return texte
    .split("\n")
    .map((ligne) => ligne.trim())
    .filter((ligne) => ligne && !/^\[.*\]$/.test(ligne) && !/^\(.*\)$/.test(ligne))
    .map((ligne) => ligne.replace(/[,;]+$/, "").trim())
    .filter(Boolean);
}

/** Pour chaque mot de `a`, l'indice de son jumeau dans `b` (plus longue sous-suite commune), ou -1. */
export function jumeaux(a: string[], b: string[]): number[] {
  const n = a.length;
  const m = b.length;
  // longueurs[i][j] = plus longue sous-suite commune de a[i..] et b[j..]
  const longueurs = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      longueurs[i]![j] = a[i] === b[j] ? longueurs[i + 1]![j + 1]! + 1 : Math.max(longueurs[i + 1]![j]!, longueurs[i]![j + 1]!);
    }
  }
  const resultat = new Array<number>(n).fill(-1);
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j] && a[i] !== "") {
      resultat[i] = j;
      i += 1;
      j += 1;
    } else if (longueurs[i + 1]![j]! >= longueurs[i]![j + 1]!) {
      i += 1;
    } else {
      j += 1;
    }
  }
  return resultat;
}

/** Une écoute courte de whisper : une fenêtre du morceau et les mots entendus dedans. */
export type Fenetre = { debut: number; fin: number; mots: MotEntendu[] };

// Constaté le 16/10/2026 sur « 10 ANS » (112 BPM) : sur le morceau entier,
// whisper LISSE ses temps sur une grille de 2,00 s et prend 1 s de retard en
// huit lignes. Sur une fenêtre de 10 s, il tombe à quelques centièmes de la
// mesure, sauf au bord : le premier mot se colle au début de la fenêtre.
export const BORD_DE_FENETRE = 1.5;
const TOLERANCE = 0.8;

/**
 * Recale les mots de l'écoute complète (l'ordre, fiable) sur les écoutes par
 * fenêtres (les temps, fiables loin des bords). On avance mot à mot avec le
 * décalage constaté : un mot sans jumeau proche garde le décalage de son voisin.
 */
export function recalerSurLesFenetres(base: MotEntendu[], fenetres: Fenetre[]): MotEntendu[] {
  const candidats = fenetres.flatMap((f) =>
    f.mots.filter((m) => m.debut >= f.debut + BORD_DE_FENETRE && m.debut <= f.fin - BORD_DE_FENETRE),
  );
  let decalage = 0;
  let precedent = 0;
  return base.map((mot) => {
    const attendu = mot.debut + decalage;
    const cle = normaliser(mot.texte);
    let jumeau: MotEntendu | undefined;
    for (const candidat of candidats) {
      if (normaliser(candidat.texte) !== cle || Math.abs(candidat.debut - attendu) > TOLERANCE) continue;
      if (!jumeau || Math.abs(candidat.debut - attendu) < Math.abs(jumeau.debut - attendu)) jumeau = candidat;
    }
    if (jumeau) decalage = jumeau.debut - mot.debut;
    const debut = Math.max(precedent, jumeau ? jumeau.debut : attendu);
    const fin = Math.max(debut, jumeau ? jumeau.fin : mot.fin + decalage);
    precedent = debut;
    return { texte: mot.texte, debut, fin };
  });
}

/**
 * Cale les lignes écrites par l'artiste sur les mots entendus par whisper.
 * Retourne aussi le taux de mots reconnus : en dessous de 50 %, le texte ne
 * correspond probablement pas à ce morceau (ou à ce passage).
 */
export function calerLesParoles(lignes: string[], entendus: MotEntendu[]): { lignes: LigneCalee[]; reconnus: number } {
  const propres = entendus.filter((mot) => !estUnMarqueur(mot.texte));
  const ecrits = lignes.map((ligne) => ligne.split(/\s+/).filter(Boolean));
  const aPlat = ecrits.flat();
  const indices = jumeaux(aPlat.map(normaliser), propres.map((mot) => normaliser(mot.texte)));
  const temps: ({ debut: number; fin: number } | null)[] = indices.map((j) => (j >= 0 ? { debut: propres[j]!.debut, fin: propres[j]!.fin } : null));

  // Un mot non reconnu se glisse entre le reconnu d'avant et celui d'après, à parts égales.
  let k = 0;
  while (k < temps.length) {
    if (temps[k]) {
      k += 1;
      continue;
    }
    let fin = k;
    while (fin < temps.length && !temps[fin]) fin += 1;
    const avant = k > 0 ? temps[k - 1]!.fin : (temps[fin]?.debut ?? 0) - 0.4 * (fin - k);
    const apres = fin < temps.length ? temps[fin]!.debut : avant + 0.4 * (fin - k);
    const pas = Math.max(0, apres - avant) / (fin - k);
    for (let x = k; x < fin; x += 1) temps[x] = { debut: avant + pas * (x - k), fin: avant + pas * (x - k + 1) };
    k = fin;
  }

  let curseur = 0;
  const calees = ecrits.map((mots) => ({
    mots: mots.map((texte) => {
      const t = temps[curseur]!;
      curseur += 1;
      return { texte, debut: Math.max(0, t.debut), fin: Math.max(t.debut, t.fin) };
    }),
  }));
  const reconnus = aPlat.length === 0 ? 0 : indices.filter((j) => j >= 0).length / aPlat.length;
  return { lignes: assainir(calees), reconnus };
}

// Un mot dure au moins ça : en dessous, il « s'allume d'un coup » au lieu de se remplir.
export const DUREE_MINIMALE_D_UN_MOT = 0.08;

/**
 * Les impossibilités physiques, corrigées quel que soit le style (rap, chant tenu,
 * voix off) : aucune phrase ne commence avant que la précédente ait fini, et aucun
 * mot ne dure zéro seconde. Constaté le 18/10/2026 sur « 10 ANS » : des phrases qui
 * se chevauchaient (28,04 s contre 28,16 s) et jusqu'à trois mots par ligne de
 * durée nulle. Les DÉBUTS sont plus fiables que les fins (whisper étire chaque fin
 * jusqu'au mot suivant) : c'est la fin de la phrase précédente qui recule.
 * Rien ici ne devine une durée « normale » : une note tenue garde la sienne.
 */
export function assainir(lignes: LigneCalee[]): LigneCalee[] {
  const mots = lignes.flatMap((ligne) => ligne.mots.map((mot) => ({ ...mot })));
  // L'ordre d'abord : un mot ne commence jamais avant le précédent.
  for (let i = 1; i < mots.length; i += 1) mots[i]!.debut = Math.max(mots[i]!.debut, mots[i - 1]!.debut);
  // Une suite de mots collés au même instant se partage le temps jusqu'au mot suivant.
  let i = 0;
  while (i < mots.length) {
    let j = i;
    while (j + 1 < mots.length && mots[j + 1]!.debut - mots[i]!.debut < DUREE_MINIMALE_D_UN_MOT) j += 1;
    if (j > i) {
      const suivant = j + 1 < mots.length ? mots[j + 1]!.debut : mots[j]!.fin;
      const pas = Math.max(DUREE_MINIMALE_D_UN_MOT, (Math.max(suivant, mots[j]!.fin) - mots[i]!.debut) / (j - i + 1));
      for (let k = i; k <= j; k += 1) mots[k]!.debut = mots[i]!.debut + pas * (k - i);
    }
    i = j + 1;
  }
  // Chaque mot finit avant le suivant, et dure au moins le minimum quand il y a la place.
  for (let k = 0; k < mots.length; k += 1) {
    const mot = mots[k]!;
    const suivant = mots[k + 1]?.debut ?? Infinity;
    mot.fin = Math.min(Math.max(mot.fin, mot.debut + DUREE_MINIMALE_D_UN_MOT), suivant);
    mot.fin = Math.max(mot.fin, mot.debut);
  }
  let curseur = 0;
  return lignes.map((ligne) => ({ mots: ligne.mots.map(() => mots[curseur++]!) }));
}
