/**
 * Ce que la console du hub retient d'une visite à l'autre, et le contrat du
 * canal qui la relie à sa fenêtre détachée (/console/window).
 */

/**
 * - fermee    : la barre de navigation est en bas, la console attend.
 * - feuille   : la console REMPLACE la barre (feuille flottante en bas).
 * - flottante : petite fenêtre déplaçable dans la page, la barre revient.
 * - fenetre   : fenêtre séparée du navigateur (multi-écran).
 */
export type ModeDeLaConsole = "fermee" | "feuille" | "flottante" | "fenetre";

export const CLE_DU_MODE = "motion-hubconsole-mode";
export const CLE_DE_LA_HAUTEUR = "motion-console-h";
export const CLE_DE_LA_FLOTTANTE = "motion-console-float";
export const CLE_DES_PRISES = "motion-hubconsole-takes";

export const CANAL = "gm-console";
export const ADRESSE_DE_LA_FENETRE = "/console/window";
export const NOM_DE_LA_FENETRE = "gm-console";
export const TAILLE_DE_LA_FENETRE = "width=560,height=760";

/** Messages du BroadcastChannel "gm-console" (principale ↔ détachée). */
export type MessageDuCanal =
  | { t: "ping"; nonce: string } // détachée → principale (avant nav)
  | { t: "pong"; nonce: string }
  | { t: "main-ping"; nonce: string } // principale → détachée (vivante ?)
  | { t: "main-pong"; nonce: string }
  | { t: "open-tour"; tourId: string } // détachée → principale : navigue
  | { t: "tour-created"; tourId: string } // détachée → principale : refresh
  | { t: "takes-sync"; payload: string } // détachée → principale : prises
  | { t: "focus" } // principale → détachée : window.focus()
  | { t: "bye" }; // détachée : pagehide

// Les valeurs écrites avant la barre du bas (« drawer », « float »…) restent lisibles.
const ANCIENS_NOMS: Record<string, ModeDeLaConsole> = {
  closed: "fermee",
  drawer: "feuille",
  float: "flottante",
  window: "fenetre",
};

export function modeEnregistre(): ModeDeLaConsole | null {
  try {
    const brut = localStorage.getItem(CLE_DU_MODE);
    if (!brut) return null;
    if (brut === "fermee" || brut === "feuille" || brut === "flottante" || brut === "fenetre") return brut;
    return ANCIENS_NOMS[brut] ?? null;
  } catch {
    return null;
  }
}

export function enregistrer(cle: string, valeur: string): void {
  try {
    localStorage.setItem(cle, valeur);
  } catch {
    // stockage bloqué (navigation privée) : la console marche, elle oublie juste
  }
}

export function lire(cle: string): string | null {
  try {
    return localStorage.getItem(cle);
  } catch {
    return null;
  }
}
