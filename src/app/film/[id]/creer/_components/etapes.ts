/**
 * Partagé entre le composant client (assistant-du-film.tsx) et la page serveur
 * (page.tsx) : un const exporté depuis un module "use client" devient une
 * référence client côté serveur (son .includes() plante), donc ORDRE vit ici,
 * hors de toute frontière RSC.
 */
export type Etape = "marque" | "serie" | "musique" | "ecrans" | "histoire" | "pret";
export const ORDRE: Etape[] = ["marque", "serie", "musique", "ecrans", "histoire", "pret"];
