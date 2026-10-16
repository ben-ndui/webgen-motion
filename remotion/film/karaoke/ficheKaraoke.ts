// LA fiche du clip karaoké. Contrat : `karaoke/spec.ts`.
//
// EXEMPLE du gabarit : « 10 ANS » de Wes Øf. (Ben), premier titre de l'EP
// « 29 % ». Le morceau et ses paroles vivent dans public/karaoke/, hors du
// brain (.gitignore) :
//   cp "<morceau>" public/karaoke/wes-of-10-ans/morceau.mp3
//   node scripts/caler-paroles.mjs <morceau> public/karaoke/wes-of-10-ans [paroles.txt]
// La palette est une palette d'ESSAI, en attendant la DA de l'artiste.
//
// Ce fichier n'importe que des types : Node le lit tel quel.
import type { KaraokeSpec } from "./spec";

export const KARAOKE: KaraokeSpec = {
  exemple: true,
  sujet: "wes-of-10-ans",

  marque: {
    nom: "Wes Øf.",
    couleurs: {
      encre: "#0B0614",
      clair: "#FFF6EC",
      accent: "#FF5A36",
      accentSurClair: "#C2361A",
      accentSurSombre: "#FFB36B",
      bulleRecue: "#E9E9EB",
    },
    police: "Jost",
    logo: { type: "motSymbole", texte: "wes øf.", graisse: 600, approche: -0.03 },
    ombreTelephone: "0 2px 0 rgba(11,6,20,0.10), 0 40px 90px rgba(11,6,20,0.22)",
    contact: "Clip réalisé avec GEN MOTION",
  },

  morceau: {
    fichier: "karaoke/wes-of-10-ans/morceau.mp3",
    titre: "10 ANS",
    artiste: "Wes Øf.",
    // Le premier refrain : mesure 7 (fin de l'intro) jusqu'avant la reprise du refrain
    // (calée à 34,03 s). La dernière ligne reste ensuite 1,5 s à l'écran (TENUE_FINALE).
    // Tempo et premier temps MESURÉS le 16/10/2026 (npm run musique).
    debut: 13.0,
    fin: 33.9,
    tempo: 112.1,
    premierTemps: 0.14,
  },
  paroles: "karaoke/wes-of-10-ans/paroles.json",
  decor: "horizon",

  textes: {
    fr: { disponible: "Extrait de l'EP « 29 % »" },
    en: { disponible: "From the EP “29 %”" },
  },

  declinaisons: [
    { nom: "Karaoke-FR", langue: "fr", version: "long", avecContact: false },
    { nom: "Karaoke-Court-FR", langue: "fr", version: "court", avecContact: false },
  ],
};
