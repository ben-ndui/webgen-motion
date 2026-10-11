/**
 * Les niveaux sonores de la voix off. Mesurés le 12/10/2026 sur Maison
 * Saya : musique du commerce vers -10 LUFS, voix normalisée à -14, musique
 * à 30 % sous la voix → la voix ne dépassait la musique que de 4 dB, et
 * sur une house écoutée sur un ordinateur, on ne l'entendait plus.
 * Une voix off de publicité passe 10 dB et plus au-dessus.
 */
// Volume de la musique PENDANT la voix (−16 dB).
export const MUSIQUE_SOUS_LA_VOIX = 0.15;
// Volume cible d'une voix, en LUFS.
export const VOLUME_DE_LA_VOIX_LUFS = -13;
