/**
 * Convertit les *marks* Google TTS (début de chaque mot, issus des
 * `<mark>` SSML) en **alignement char-level** au format ElevenLabs, pour
 * que le pipeline de sous-titres karaoké (couplé à ElevenLabs) fonctionne
 * tel quel avec la voix Google gratuite.
 *
 * Pure + déterministe → testable sans TTS réel ni rendu Remotion.
 */

export interface CharAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

export interface WordMark {
  word: string;
  /** Début du mot dans l'audio, en secondes (timepoint Google). */
  timeSec: number;
}

/**
 * @param text  Le texte exact synthétisé (mêmes mots/ordre que les marks).
 * @param marks Marks Google ordonnés (début de chaque mot).
 * @param totalDurationSec Durée totale de l'audio (fin du dernier mot).
 */
export function marksToCharAlignment(
  text: string,
  marks: WordMark[],
  totalDurationSec: number,
): CharAlignment {
  const characters = [...text];
  const n = characters.length;
  const starts = new Array<number>(n).fill(0);
  const ends = new Array<number>(n).fill(0);

  // Localise chaque mot dans le texte, dans l'ordre → plage [s, e[ + temps.
  const ranges: { s: number; e: number; t0: number; t1: number }[] = [];
  let cursor = 0;
  for (let i = 0; i < marks.length; i++) {
    const w = marks[i]?.word;
    if (!w) continue;
    const idx = text.indexOf(w, cursor);
    if (idx < 0) continue;
    const t0 = marks[i].timeSec;
    const rawT1 = i + 1 < marks.length ? marks[i + 1].timeSec : totalDurationSec;
    ranges.push({ s: idx, e: idx + w.length, t0, t1: Math.max(rawT1, t0) });
    cursor = idx + w.length;
  }

  if (ranges.length === 0) {
    // Pas de mark exploitable : tout l'audio sur [0, durée].
    return {
      characters,
      character_start_times_seconds: starts.map(() => 0),
      character_end_times_seconds: ends.map(() => totalDurationSec),
    };
  }

  let ri = 0;
  for (let c = 0; c < n; c++) {
    while (ri < ranges.length && c >= ranges[ri].e) ri++;
    const r = ranges[ri];
    if (r && c >= r.s && c < r.e) {
      // Char DANS un mot : temps interpolé linéairement sur le mot.
      const wlen = r.e - r.s;
      const pos = c - r.s;
      const span = r.t1 - r.t0;
      starts[c] = r.t0 + (span * pos) / wlen;
      ends[c] = r.t0 + (span * (pos + 1)) / wlen;
    } else {
      // Char de séparation : entre la fin du mot précédent et le début du suivant.
      const prev = ri > 0 ? ranges[ri - 1] : undefined;
      const next = r; // r === undefined si après le dernier mot
      starts[c] = prev ? prev.t1 : 0;
      ends[c] = next ? next.t0 : totalDurationSec;
    }
  }

  return {
    characters,
    character_start_times_seconds: starts,
    character_end_times_seconds: ends,
  };
}
