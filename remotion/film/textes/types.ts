// Tout ce qui se LIT dans le film. Aucune phrase n'est écrite dans un plan :
// traduire le film, c'est écrire un autre fichier de ce type.
//
// Règle maison : chaque affirmation est VRAIE le jour du rendu. Un chiffre
// sort d'un vrai calcul de l'app, prouvé par un test de l'app ; une
// disponibilité (« sur l'App Store ») est vérifiée sur le store.

export type Langue = "en" | "fr";

export type MessageDeLaConversation = {
  // « moi » : le propriétaire du téléphone, bulle à droite, couleur d'accent.
  // « autre » : son interlocuteur, bulle grise à gauche.
  auteur: "moi" | "autre";
  texte: string;
};

/** Ce qui se lit dans les plans de la bibliothèque (spec.bibliotheque). */
export type TextesDeLaBibliotheque = {
  // Typo cinétique : un mot court, qui arrive lettre à lettre. S'il finit par
  // un point, ce point devient la pastille d'accent qui tombe dessus.
  mot: string;
  // La phrase qui tourne en anneau autour de la pastille ; répétée pour
  // faire le tour (« Conçue · Codée · Livrée »).
  anneau: string;
  // Une légende par capture de l'éventail, dans le même ordre.
  legendesEventail: string[];
  // La ligne qui suit le logo construit.
  signature: string;
};

export type TextesDuFilm = {
  // Dossier des captures de l'application dans CETTE langue (public/).
  dossierDesEcrans: string;
  probleme: {
    // Heure affichée dans la barre de statut du téléphone.
    heure: string;
    // La PREMIÈRE bulle revient à la fin : c'est la relance restée sans suite.
    messages: [MessageDeLaConversation, ...MessageDeLaConversation[]];
  };
  bascule: {
    constat: string;
    // Le chiffre, en accent. Il sort d'un vrai calcul de l'app.
    chiffre: string;
    signature: string;
  };
  // Une légende par capture du parcours (ecrans.ts), un mot par temps.
  parcours: [string, string, string, string];
  evenement: {
    chute: string;
  };
  marque: {
    // Trois mots, un par temps ; le troisième en accent.
    mots: [string, string, string];
  };
  fin: {
    disponible: string;
  };
  // Légendes de l'aperçu App Store, une par plan de `apercu/prises.ts`.
  // Règles d'Apple : lisibles sans le son, aucune date, AUCUN PRIX.
  apercu: Record<string, string>;
  // Présent si et seulement si la fiche a une `bibliotheque`.
  bibliotheque?: TextesDeLaBibliotheque;
};
