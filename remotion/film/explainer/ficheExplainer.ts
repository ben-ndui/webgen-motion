// LA fiche de l'explainer : tout ce qui change d'une vidéo à l'autre est ici.
// Contrat et sens de chaque champ : `explainer/spec.ts`.
//
// EXEMPLE du gabarit, sur un sujet VRAI (Kandidate, 16/10/2026) : une annonce
// d'emploi restait en ligne alors que le poste était fermé chez l'employeur.
// Pour une vraie vidéo, tout se réécrit, puis `exemple: false`.
//
// Ce fichier n'importe que des types : Node le lit tel quel (avant-rendu.mjs).
import type { ExplainerSpec } from "./spec";

export const EXPLAINER: ExplainerSpec = {
  exemple: true,
  sujet: "offres-fermees",

  marque: {
    nom: "Smooth & Design",
    couleurs: {
      encre: "#010D23",
      clair: "#FFFFFF",
      accent: "#2F6BFF",
      accentSurClair: "#0041E0",
      accentSurSombre: "#8FAFFF",
      bulleRecue: "#E9E9EB",
    },
    police: "Jost",
    logo: { type: "motSymbole", texte: "smooth & design", graisse: 600, approche: -0.03 },
    ombreTelephone: "0 2px 0 rgba(1,13,35,0.10), 0 40px 90px rgba(1,13,35,0.22)",
    contact: "smoothandesign.fr",
  },

  scenes: [
    { id: "constat", mesures: 3, visuel: { type: "chiffre", picto: "document" } },
    { id: "deux-pages", mesures: 2, visuel: { type: "opposition", gauche: "ecran", droite: "formulaire" } },
    { id: "piege", mesures: 3, visuel: { type: "tampon", picto: "formulaire" } },
    { id: "parade", mesures: 3, visuel: { type: "liste" } },
    { id: "lecon", mesures: 2, visuel: { type: "phrase", picto: "loupe" } },
  ],

  textes: {
    fr: {
      scenes: {
        constat: {
          chapitre: "Constaté le 16 octobre",
          sousTitre: "Un dossier prêt sur quatre visait un poste déjà fermé",
          precision: "L'annonce, elle, était toujours en ligne",
          mots: { type: "chiffre", valeur: "1 sur 4" },
        },
        "deux-pages": {
          chapitre: "Deux pages, deux vérités",
          sousTitre: "Le site d'annonces garde l'offre, l'employeur a fermé le poste",
          mots: {
            type: "opposition",
            gauche: { titre: "L'annonce", detail: "toujours en ligne" },
            droite: { titre: "Le formulaire", detail: "poste fermé" },
          },
        },
        piege: {
          chapitre: "Le piège",
          sousTitre: "Un formulaire fermé répond «\u00A0tout va bien\u00A0» à un robot",
          precision: "Il n'affiche «\u00A0fermé\u00A0» qu'une fois la page dessinée",
          mots: { type: "tampon", tampon: "Fermé" },
        },
        parade: {
          chapitre: "La parade",
          sousTitre: "Kandidate vérifie maintenant chez l'employeur",
          mots: {
            type: "liste",
            elements: [
              "Demander à l'employeur, pas au site d'annonces",
              "Revérifier à l'ouverture de l'offre",
              "Dans le doute, ne rien cacher",
            ],
          },
        },
        lecon: {
          chapitre: "À retenir",
          mots: { type: "phrase", phrase: "Une annonce en ligne n'est pas un poste ouvert.", motFort: "pas un poste ouvert" },
        },
      },
      signature: "Des outils qui disent vrai.",
    },
    en: {
      scenes: {
        constat: {
          chapitre: "Found on October 16",
          sousTitre: "One ready application in four targeted a closed position",
          precision: "The job ad was still online",
          mots: { type: "chiffre", valeur: "1 in 4" },
        },
        "deux-pages": {
          chapitre: "Two pages, two truths",
          sousTitre: "The job board keeps the ad, the employer has closed the role",
          mots: {
            type: "opposition",
            gauche: { titre: "The job ad", detail: "still online" },
            droite: { titre: "The form", detail: "role closed" },
          },
        },
        piege: {
          chapitre: "The trap",
          sousTitre: "A closed form tells a robot that all is well",
          precision: "It only shows “closed” once the page is drawn",
          mots: { type: "tampon", tampon: "Closed" },
        },
        parade: {
          chapitre: "The fix",
          sousTitre: "Kandidate now checks with the employer",
          mots: {
            type: "liste",
            elements: ["Ask the employer, not the job board", "Check again when the offer opens", "When in doubt, hide nothing"],
          },
        },
        lecon: {
          chapitre: "Takeaway",
          mots: { type: "phrase", phrase: "A live job ad is not an open position.", motFort: "not an open position" },
        },
      },
      signature: "Tools that tell the truth.",
    },
  },

  // Le morceau maison (voir film.ts) : licence réglée.
  musique: {
    fichier: "musique/aurectheme-summer-house-583397.mp3",
    titre: "Summer House, AurecTheme",
    source: "https://pixabay.com/music/house-summer-house-583397/",
    tempo: 123.52,
    premierTemps: 0.144,
    volume: 0.7,
  },

  declinaisons: [
    { nom: "Explainer-FR", langue: "fr", version: "long", avecContact: true },
    { nom: "Explainer-EN", langue: "en", version: "long", avecContact: true },
    { nom: "Explainer-Court-FR", langue: "fr", version: "court", avecContact: true },
    { nom: "Explainer-Court-EN", langue: "en", version: "court", avecContact: true },
  ],
};
