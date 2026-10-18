/**
 * Les temps mot à mot d'une voix qui n'en donne pas (Voicebox), par alignement forcé :
 * le texte dit est connu, le modèle de calage du karaoké (karaoke-alignement/) trouve
 * où chaque mot est prononcé. Rendu au format ElevenLabs (temps par caractère), celui
 * que le mode narratif et les sous-titres attendent déjà. RUNNER SEULEMENT (onnxruntime).
 *
 * Pourquoi : jusqu'au 18/10/2026 le mode narratif refusait Voicebox (« no char-level
 * timings »), donc la voix clonée de Ben, la seule gratuite, n'y avait pas accès.
 */
import { marksToCharAlignment } from "../google-alignment";
import { SEUIL_DE_RECONNAISSANCE_ALIGNEE } from "../karaoke-alignement/aligner-les-paroles";
import { calerParAlignement } from "../karaoke-alignement/caler-par-alignement";
import { alignementPossibleIci, cheminDuModeleDAlignement } from "../karaoke-alignement/emplacement-du-modele";
import { MODELE_FRANCAIS } from "../karaoke-alignement/modele-francais";
import type { ElevenLabsAlignment } from "./types";

type MotPose = { texte: string; debut: number; fin: number };

/** Le calage est-il possible pour cette langue sur cette machine (modèle installé, entier) ? */
export function voixAlignable(langue: string): boolean {
  return cheminDuModeleDAlignement(langue) !== null;
}

/** Pourquoi le calage est impossible, dit sans promettre une installation qui échouerait. */
export function raisonNonAlignable(langue: string): string {
  if (!alignementPossibleIci()) return "le calage mot à mot ne tourne pas sur un Mac Intel";
  if (langue !== MODELE_FRANCAIS.langue) return `le calage mot à mot n'existe qu'en français (langue de la voix : ${langue})`;
  return "le calage mot à mot n'est pas installé (Réglages › Écoute locale)";
}

/** Les mots posés (début de chacun) → temps par caractère du texte exact synthétisé. */
export function motsVersAlignement(texte: string, mots: MotPose[]): ElevenLabsAlignment {
  const marks = mots.map((mot) => ({ word: mot.texte, timeSec: mot.debut }));
  return marksToCharAlignment(texte, marks, mots.at(-1)?.fin ?? 0);
}

export async function alignerLaVoix(
  audio: string,
  texte: string,
  langue: string,
  journal: (ligne: string) => void,
): Promise<ElevenLabsAlignment> {
  const modele = cheminDuModeleDAlignement(langue);
  if (!modele) throw new Error(`Mode narratif impossible : ${raisonNonAlignable(langue)}.`);
  // Une seule « ligne » : la narration entière, retours à la ligne compris.
  const { lignes, reconnus } = await calerParAlignement(modele, audio, [texte.replace(/\s+/g, " ").trim()], journal);
  // Le texte calé est celui que la voix a reçu : un calage faible veut dire que le moteur a
  // sauté ou inventé un passage. Des temps faux décaleraient toutes les coupes : on refuse.
  if (reconnus < SEUIL_DE_RECONNAISSANCE_ALIGNEE) {
    throw new Error(`La voix ne suit pas le texte (${Math.round(reconnus * 100)} % des mots entendus nettement) : régénère-la.`);
  }
  return motsVersAlignement(texte, lignes.flatMap((ligne) => ligne.mots));
}
