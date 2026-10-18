/**
 * Le modèle d'écoute qui aligne les paroles FRANÇAISES.
 *
 * Origine : jonatasgrosman/wav2vec2-large-xlsr-53-french (licence Apache 2.0,
 * usage commercial permis), converti en ONNX int8 par le banc
 * ~/.webgen-motion/calage-precis/exporter_w2v.py (seules les MatMul, poids par
 * canal : la quantification complète décalait des débuts de ligne d'une seconde).
 * La normalisation de l'onde et le log_softmax sont DANS le graphe.
 *
 * MMS (Meta), un peu plus précis, est écarté : licence CC-BY-NC, interdite
 * dans un produit payant.
 */

import type { Alphabet } from "./lettres";

export const ALPHABET_FRANCAIS: Alphabet = {
  "'": 5, "-": 6, a: 7, b: 8, c: 9, d: 10, e: 11, f: 12, g: 13, h: 14, i: 15, j: 16, k: 17,
  l: 18, m: 19, n: 20, o: 21, p: 22, q: 23, r: 24, s: 25, t: 26, u: 27, v: 28, w: 29, x: 30,
  y: 31, z: 32, à: 33, á: 34, â: 35, ä: 36, ç: 37, è: 38, é: 39, ê: 40, ë: 41, í: 42, î: 43,
  ï: 44, ñ: 45, ó: 46, ô: 47, ö: 48, ù: 49, ú: 50, û: 51, ü: 52, ć: 53, č: 54, ō: 55, œ: 56,
  š: 57, ș: 58,
};

/**
 * Où le télécharger, et comment prouver que c'est le bon : dépôt Smooth & Design
 * sur Hugging Face, adresse ÉPINGLÉE au commit de publication (le fichier ne
 * peut pas changer sous l'app), taille et empreinte relevées le 18/10/2026.
 */
export const ADRESSE_DU_MODELE_FRANCAIS =
  "https://huggingface.co/smoothandesign/genmotion-alignement-fr/resolve/523837c9271669841dad6738d2213444bc74295f/alignement-fr-int8.onnx";

export const MODELE_FRANCAIS = {
  langue: "fr",
  fichier: "alignement-fr-int8.onnx",
  octets: 356_211_531,
  sha256: "e586fad466173fd8e31991c9fe8948e83be69ea1bd53019197af6ca556832286",
  adresse: ADRESSE_DU_MODELE_FRANCAIS,
  blanc: 0,
  classes: 59,
  /** Une trame toutes les 320 échantillons à 16 kHz : 20 ms. */
  echantillonsParTrame: 320,
} as const;
