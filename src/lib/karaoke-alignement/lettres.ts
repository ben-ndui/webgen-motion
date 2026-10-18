import { nombreEnLettres } from "./nombres-en-lettres";

/**
 * Ce que le modèle d'écoute sait lire d'un mot écrit : ses lettres, une à une,
 * en numéros de son alphabet. « L'époque, » → l ' é p o q u e ; « 10 » → d i x.
 * Une lettre que le modèle ne connaît pas avec son accent est lue sans
 * (« ÿ » → « y ») ; une ponctuation est ignorée.
 */

export type Alphabet = Readonly<Record<string, number>>;

function sansAccent(lettre: string): string {
  return lettre.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function lettresDuMot(mot: string, alphabet: Alphabet): number[] {
  const ecrit = mot
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/\d+/g, (chiffres) => nombreEnLettres(chiffres) ?? "")
    .normalize("NFC");
  const numeros: number[] = [];
  for (const lettre of ecrit) {
    const numero = alphabet[lettre] ?? alphabet[sansAccent(lettre)];
    if (numero !== undefined) numeros.push(numero);
  }
  return numeros;
}
