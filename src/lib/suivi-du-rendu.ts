/**
 * Lire la progression d'un rendu Remotion pour l'écran : à quelle ÉTAPE on en
 * est, un libellé humain, et le temps restant que Remotion estime lui-même.
 * Remotion enchaîne les étapes sans les mêler : la préparation (bundling),
 * toutes les images, puis l'encodage de la vidéo (cli/dist/progress-bar.js).
 */

export const ETAPES_DU_RENDU = ["preparation", "images", "encodage", "finalisation"] as const;
export type EtapeDuRendu = (typeof ETAPES_DU_RENDU)[number];

export const NOMS_DES_ETAPES: Record<EtapeDuRendu, string> = {
  preparation: "Préparation",
  images: "Images",
  encodage: "Encodage",
  finalisation: "Finalisation",
};

export type EvenementDeRendu =
  | { type: "phase"; etape: EtapeDuRendu; label: string }
  | { type: "progress"; etape: EtapeDuRendu; frames: number; total: number; label: string; restant: number | null };

/** « 1h 2m 5s », « 1m 20s », « 45s » (format de Remotion) → secondes ; null si absent ou illisible. */
export function lireLeTempsRestant(texte: string | undefined): number | null {
  if (!texte) return null;
  const morceaux = [...texte.matchAll(/(\d+)\s*([hms])/g)];
  if (morceaux.length === 0) return null;
  const facteurs = { h: 3600, m: 60, s: 1 } as const;
  return morceaux.reduce((total, [, nombre, unite]) => total + Number(nombre) * facteurs[unite as keyof typeof facteurs], 0);
}

/** 45 → « 45 s », 80 → « 1 min 20 », 120 → « 2 min », 3900 → « 1 h 05 ». */
export function direUneDuree(secondes: number): string {
  // Arrondir AVANT de découper : 3599,6 s donnait « 59 min 60 ».
  const arrondies = Math.max(1, Math.round(secondes));
  if (arrondies < 60) return `${arrondies} s`;
  if (arrondies < 3600) {
    const minutes = Math.floor(arrondies / 60);
    const reste = arrondies % 60;
    return reste === 0 ? `${minutes} min` : `${minutes} min ${String(reste).padStart(2, "0")}`;
  }
  const minutesEnPlus = Math.round((arrondies % 3600) / 60);
  const heures = Math.floor(arrondies / 3600) + (minutesEnPlus === 60 ? 1 : 0);
  return `${heures} h ${String(minutesEnPlus % 60).padStart(2, "0")}`;
}

export function direLeTempsRestant(secondes: number): string {
  return `encore ~${direUneDuree(secondes)}`;
}

/** Une ligne de sortie du runner (bannières + CLI Remotion) → un événement pour l'écran ; null : rien à montrer. */
export function lireLigneDuRendu(ligne: string): EvenementDeRendu | null {
  if (!ligne) return null;
  // « ▶ Film … » ou « ▶ Explainer … » : la bannière de début des deux runners.
  if (ligne.startsWith("▶ ")) return { type: "phase", etape: "preparation", label: "Préparation du rendu…" };

  let m = ligne.match(/^Bundling (\d+)%/);
  if (m) return { type: "phase", etape: "preparation", label: `Préparation de la composition · ${m[1]} %` };

  m = ligne.match(/^Rendered (\d+)\/(\d+)(?:, time remaining: (.+))?/);
  if (m) {
    const frames = parseInt(m[1]!, 10);
    const total = parseInt(m[2]!, 10);
    return { type: "progress", etape: "images", frames, total, label: `Image ${frames} sur ${total}`, restant: lireLeTempsRestant(m[3]) };
  }

  m = ligne.match(/^Encoded (\d+)\/(\d+)/);
  if (m) {
    const frames = parseInt(m[1]!, 10);
    const total = parseInt(m[2]!, 10);
    return { type: "progress", etape: "encodage", frames, total, label: `Encodage de la vidéo · ${frames} sur ${total}`, restant: null };
  }

  if (ligne.startsWith("✓ Done")) return { type: "phase", etape: "finalisation", label: "Finalisation…" };
  return null;
}
