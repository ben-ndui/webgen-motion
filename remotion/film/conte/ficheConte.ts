// LA fiche du conte : tout ce qui change d'une vidéo à l'autre est ici.
// Contrat : `conte/spec.ts`.
//
// EXEMPLE du gabarit, sur une histoire VRAIE : la recherche d'emploi de Ben
// avec Kandidate. 113 offres lues et notées, 9 qui valent une candidature :
// chiffres relevés le 16/10/2026 dans la mémoire de Kandidate.
// Pour un vrai conte, tout se réécrit, puis `exemple: false`.
//
// Ce fichier n'importe que des types : Node le lit tel quel.
import type { ConteSpec } from "./spec";

export const CONTE: ConteSpec = {
  exemple: true,
  sujet: "kandidate-offres",

  marque: {
    nom: "Kandidate",
    couleurs: {
      encre: "#010D23",
      clair: "#FFFFFF",
      accent: "#2F6BFF",
      accentSurClair: "#0041E0",
      accentSurSombre: "#8FAFFF",
      bulleRecue: "#E9E9EB",
    },
    police: "Jost",
    logo: { type: "motSymbole", texte: "kandidate", graisse: 600, approche: -0.03 },
    ombreTelephone: "0 2px 0 rgba(1,13,35,0.10), 0 40px 90px rgba(1,13,35,0.22)",
    contact: "smoothandesign.fr/kandidate",
  },

  heros: { type: "picto", picto: "personne" },
  objets: [
    { type: "picto", picto: "document" },
    { type: "picto", picto: "formulaire" },
    { type: "picto", picto: "ecran" },
    { type: "picto", picto: "horloge" },
    { type: "picto", picto: "document" },
    { type: "picto", picto: "formulaire" },
  ],
  compteur: { total: 113, apres: 9, decimales: 0 },

  textes: {
    fr: {
      epoque: "Avant Kandidate",
      avant: "Chercher un poste, c'était simple.",
      avantDetail: "Quelques annonces, une lettre, un envoi.",
      chute: "Puis les offres sont tombées du ciel.",
      libelleCompteur: "À lire",
      unite: "offres",
      constat: "Cause officielle de l'épuisement :",
      constatChiffre: "113 offres à lire.",
      tampon: "Épuisé",
      sauf: "Sauf un.",
      nom: "Kandidate",
      promesse: "Toutes les offres lues. Les bonnes en tête.",
      avantages: ["L'IA lit et note chaque offre.", "Tu tries d'un geste.", "La relance est déjà écrite."],
      adresse: "smoothandesign.fr/kandidate",
    },
    en: {
      epoque: "Before Kandidate",
      avant: "Looking for a job used to be simple.",
      avantDetail: "A few ads, a letter, one send.",
      chute: "Then the job offers fell from the sky.",
      libelleCompteur: "To read",
      unite: "offers",
      constat: "Official cause of exhaustion:",
      constatChiffre: "113 offers to read.",
      tampon: "Burnt out",
      sauf: "Except one.",
      nom: "Kandidate",
      promesse: "Every offer read. The best ones first.",
      avantages: ["AI reads and scores every offer.", "Sort with a swipe.", "The follow-up is already written."],
      adresse: "smoothandesign.fr/kandidate",
    },
  },

  musique: {
    fichier: "musique/aurectheme-summer-house-583397.mp3",
    titre: "Summer House, AurecTheme",
    source: "https://pixabay.com/music/house-summer-house-583397/",
    tempo: 123.52,
    premierTemps: 0.144,
    volume: 0.7,
  },

  declinaisons: [
    { nom: "Conte-FR", langue: "fr", version: "long", avecContact: true },
    { nom: "Conte-EN", langue: "en", version: "long", avecContact: true },
    { nom: "Conte-Court-FR", langue: "fr", version: "court", avecContact: true },
    { nom: "Conte-Court-EN", langue: "en", version: "court", avecContact: true },
  ],
};
