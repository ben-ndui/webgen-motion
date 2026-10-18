/**
 * Poser les paroles ÉCRITES par l'artiste sur son morceau, mot à mot, par
 * alignement forcé. Contrairement au calage par whisper (qui devine les mots,
 * puis les rapproche du texte), rien n'est deviné : le texte est donné, le
 * modèle cherche seulement où chaque lettre est chantée. Banc du 18/10/2026,
 * 4 morceaux de styles différents : 97 % des mots à ± 100 ms, contre 45 %.
 *
 * Sa limite : il lui faut les paroles COMPLÈTES. Un passage chanté mais pas
 * écrit (vocalise, refrain non saisi) n'a nulle part où aller, et le mot écrit
 * juste avant s'étire dessus. Ces mots étirés sont signalés à l'artiste.
 */

import { type LigneCalee, assainir } from "../../../remotion/film/karaoke/alignement";
import { type Alphabet, lettresDuMot } from "./lettres";
import { type Emission, alignerDeForce } from "./viterbi-ctc";

/**
 * Un mot ÉTIRÉ cache des paroles non écrites : il dure plus de 1,5 s et ses
 * lettres n'en occupent presque rien (3 à 5 % sur le banc, le reste est chanté
 * sans être écrit). Une note tenue, elle, est remplie par sa voyelle.
 */
export const DUREE_SUSPECTE = 1.5;
export const COUVERTURE_SUSPECTE = 0.2;
/** Sous ce niveau, le modèle n'entend pas ce mot là où le texte le pose (bonnes paroles : 59-85 % au-dessus ; mauvaises : 13-27 %). */
export const CONFIANCE_MINIMALE = 0.3;
/** Sous cette part de mots reconnus, ce ne sont pas les paroles du morceau (banc : bonnes ≥ 0,59, mauvaises ≤ 0,27). */
export const SEUIL_DE_RECONNAISSANCE_ALIGNEE = 0.4;

export type ParolesAlignees = {
  lignes: LigneCalee[];
  /** Part des mots que le modèle entend nettement (confiance moyenne de leurs lettres). */
  reconnus: number;
  /** Les mots (numéros de ligne et de mot, à partir de 0) qui s'étirent : des paroles manquent juste après eux. */
  motsEtires: MotEtire[];
};

export type MotEtire = { ligne: number; mot: number };
type MotPose = { debut: number; fin: number; confiance: number; couverture: number } | null;

export function alignerLesParoles(
  lignes: string[],
  emission: Emission,
  secondesParTrame: number,
  modele: { alphabet: Alphabet; blanc: number },
): ParolesAlignees {
  const mots = lignes.map((ligne) => ligne.split(/\s+/).filter(Boolean));
  const lettresParMot = mots.flat().map((mot) => lettresDuMot(mot, modele.alphabet));
  const { lettres: posees, ecarts } = alignerDeForce(emission, lettresParMot.flat(), modele.blanc);

  let curseur = 0;
  const poses: MotPose[] = lettresParMot.map((lettres) => {
    if (lettres.length === 0) return null;
    const siennes = posees.slice(curseur, curseur + lettres.length);
    curseur += lettres.length;
    const debut = siennes[0]!.debut;
    const fin = siennes.at(-1)!.fin;
    let ecart = 0;
    for (let t = debut; t < fin; t += 1) ecart += ecarts[t]!;
    const duree = Math.max(1, fin - debut);
    const couverture = siennes.reduce((total, l) => total + l.fin - l.debut, 0) / duree;
    return { debut: debut * secondesParTrame, fin: fin * secondesParTrame, confiance: Math.exp(-ecart / duree), couverture };
  });
  const temps = combler(poses);

  let indice = 0;
  const motsEtires: MotEtire[] = [];
  const calees: LigneCalee[] = mots.map((ligne, numeroDeLigne) => ({
    mots: ligne.map((texte, numeroDeMot) => {
      const pose = poses[indice];
      const [debut, fin] = temps[indice]!;
      indice += 1;
      const etire = pose !== null && fin - debut > DUREE_SUSPECTE && pose.couverture < COUVERTURE_SUSPECTE;
      if (etire) motsEtires.push({ ligne: numeroDeLigne, mot: numeroDeMot });
      return { texte, debut: arrondi(debut), fin: arrondi(fin) };
    }),
  }));
  const lisibles = poses.filter((pose): pose is NonNullable<MotPose> => pose !== null);
  const reconnus = lisibles.length === 0 ? 0 : lisibles.filter((p) => p.confiance >= CONFIANCE_MINIMALE).length / lisibles.length;
  return { lignes: assainir(calees), reconnus, motsEtires };
}

/** Un « mot » sans lettre lisible (« ! », « … ») se glisse entre ses voisins. */
function combler(poses: MotPose[]): [number, number][] {
  return poses.map((pose, i) => {
    if (pose) return [pose.debut, pose.fin];
    const avant = poses.slice(0, i).reverse().find(Boolean)?.fin ?? 0;
    const apres = poses.slice(i + 1).find(Boolean)?.debut ?? avant;
    return [avant, Math.max(avant, apres)];
  });
}

function arrondi(secondes: number): number {
  return Math.round(secondes * 1000) / 1000;
}
