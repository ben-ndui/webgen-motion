// Les pictogrammes dessinés maison (composants/Picto.tsx), communs aux formats
// (explainer, conte). Ce fichier n'importe rien : Node le lit tel quel.

/** La liste des pictogrammes. Aucun logo de marque tierce. */
export const PICTOS = [
  "robot",
  "document",
  "formulaire",
  "cadenas",
  "loupe",
  "personne",
  "serveur",
  "ecran",
  "horloge",
  "coche",
] as const;
export type Picto = (typeof PICTOS)[number];
