// LA fiche du film : tout ce qui change d'un produit à l'autre est ici, et
// nulle part ailleurs. Contrat et sens de chaque champ : `spec.ts`.
//
// EXEMPLE du gabarit : chaque texte dit ce qu'il doit devenir.
//
// Dans GenMotion, ce fichier ne sert qu'aux props par défaut de la
// composition `Film` (Studio Remotion) et aux tests. Un vrai film s'écrit en
// JSON dans `films/<id>.json` (même contrat `FilmSpec`), ses médias vont dans
// `~/.webgen-motion/films/<id>/public/`, et `scripts/render-film.ts` le rend.
import type { FilmSpec } from "./spec";

export const FILM: FilmSpec = {
  exemple: true,

  // Charte Smooth & Design (bleu #2F6BFF sur encre #010D23, Jost), celle de
  // VAGUA et de Kotizo : la remplacer par la palette FERMÉE du produit filmé.
  marque: {
    couleurs: {
      encre: "#010D23",
      clair: "#FFFFFF",
      accent: "#2F6BFF",
      accentSurClair: "#0041E0",
      accentSurSombre: "#8FAFFF",
      bulleRecue: "#E9E9EB",
    },
    police: "Jost",
    logo: { type: "motSymbole", texte: "exemple", graisse: 600, approche: -0.03 },
    ombreTelephone: "0 2px 0 rgba(1,13,35,0.10), 0 40px 90px rgba(1,13,35,0.22)",
    contact: "Smooth & Design · contact@smoothandesign.fr",
  },

  // Chaque affirmation est VRAIE le jour du rendu : un chiffre sort d'un vrai
  // calcul de l'app, prouvé par un test de l'app.
  textes: {
    fr: {
      dossierDesEcrans: "ecrans-exemple",
      probleme: {
        heure: "20:41",
        messages: [
          { auteur: "moi", texte: "Tu as pu regarder ?" },
          { auteur: "autre", texte: "Demain, promis." },
        ],
      },
      bascule: { constat: "Le constat.", chiffre: "Le vrai chiffre.", signature: "La promesse, en une phrase." },
      parcours: ["Première étape.", "Deuxième étape.", "Troisième étape.", "C'est réglé."],
      evenement: { chute: "Le problème est payé." },
      marque: { mots: ["Trois mots.", "Un par temps.", "La marque."] },
      fin: { disponible: "Disponible sur l'App Store et Google Play" },
      apercu: {},
    },
    en: {
      dossierDesEcrans: "ecrans-exemple",
      probleme: {
        heure: "8:41 PM",
        messages: [
          { auteur: "moi", texte: "Did you get a chance to look?" },
          { auteur: "autre", texte: "Tomorrow, promise." },
        ],
      },
      bascule: { constat: "The fact.", chiffre: "The real number.", signature: "The promise, in one line." },
      parcours: ["First step.", "Second step.", "Third step.", "Sorted."],
      evenement: { chute: "The problem, paid off." },
      marque: { mots: ["Three words.", "One per beat.", "The brand."] },
      fin: { disponible: "Available on the App Store and Google Play" },
      apercu: {},
    },
  },

  // Mêmes noms de fichier dans chaque langue. Vérifier que l'élément qui
  // change dans `evenement` reste au-dessus de la ligne de flottaison : le tri
  // de l'écran peut l'envoyer plus bas, et deux états seraient identiques.
  ecrans: {
    parcours: ["parcours-1.png", "parcours-2.png", "parcours-3.png", "parcours-4.png"],
    evenement: ["evenement-1.png", "evenement-2.png", "evenement-3.png", "evenement-4.png"],
    marque: "marque.png",
  },

  // Le morceau maison (VAGUA, Kotizo, films Fiverr S&D) : licence réglée.
  // Le fichier n'est pas dans le gabarit : le copier depuis
  // taxiboat/commercial/film/public/musique/ (voir README). Il est « Content
  // ID Registered » sur Pixabay : sur YouTube, une réclamation se lève avec
  // le certificat de licence déjà récupéré pour VAGUA.
  musique: {
    fichier: "musique/aurectheme-summer-house-583397.mp3",
    titre: "Summer House, AurecTheme",
    source: "https://pixabay.com/music/house-summer-house-583397/",
    tempo: 123.52,
    premierTemps: 0.144,
  },

  // Un livrable par ligne. Ajouter une version SANS contact quand la
  // plateforme l'impose : VAGUA avait « Store », le film S&D « Fiverr ».
  declinaisons: [
    { nom: "Film-FR", langue: "fr", version: "long", avecContact: true },
    { nom: "Film-EN", langue: "en", version: "long", avecContact: true },
    // Le 9:16 des réseaux circule seul, sans page autour : il signe.
    { nom: "Court-FR", langue: "fr", version: "court", avecContact: true },
    { nom: "Court-EN", langue: "en", version: "court", avecContact: true },
  ],

  // Aperçu App Store : vide tant qu'aucun rush n'est relevé (voir
  // apercu/prises.ts pour la méthode). Exemple de VAGUA :
  // { id: "carte", mesures: 2, prise: "parcours", debut: 39.3, fin: 42.5 },
  // avec la légende `textes.fr.apercu.carte`.
  apercu: { fr: [], en: [] },
};
