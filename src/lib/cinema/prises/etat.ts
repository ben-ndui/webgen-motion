import type { DecoupeDuPlan, PlanDeCinema } from "../../../../remotion/film/cinema/types";

/**
 * Les prises d'un plan : chaque génération en crée une NOUVELLE, rien n'est
 * écrasé. La prise retenue est celle que la fiche cite (`plan.fichier`) : le
 * montage la joue. La liste vit dans prises.json (serveur) ; ce module, pur,
 * sait la lire et la compléter. L'écran l'importe pour ses types.
 */
export type Prise = {
  n: number;
  // cinema/<plan>/prise-<n>.mp4, ou l'ancien cinema/<plan>.mp4 (prise 1).
  fichier: string;
  // null pour une prise d'avant les prises multiples (date inconnue).
  creeeLe: string | null;
  // Générée avec la photo du vrai produit.
  produitReel?: true;
  // La découpe de cette prise quand elle n'est PAS retenue (celle de la
  // retenue vit dans la fiche, `plan.decoupe`).
  decoupe?: DecoupeDuPlan;
};

export type RegistreDesPrises = { plans: Record<string, Prise[]> };

export const PRISES_MAX = 9999;

export function cheminDeLaPrise(planId: string, n: number): string {
  return `cinema/${planId}/prise-${n}.mp4`;
}

/**
 * Les prises du plan, ancienne vidéo comprise : un plan généré avant les
 * prises multiples cite `cinema/<plan>.mp4` sans entrée dans prises.json. Il
 * devient la prise 1, retenue (migration transparente, sans déplacer de
 * fichier). Rejouée, elle ne duplique rien.
 */
export function prisesDuPlan(registre: RegistreDesPrises, plan: Pick<PlanDeCinema, "id" | "fichier" | "produitReel">): Prise[] {
  const connues = registre.plans[plan.id] ?? [];
  if (!plan.fichier || connues.some((prise) => prise.fichier === plan.fichier)) return connues;
  const ancienne: Prise = { n: 1, fichier: plan.fichier, creeeLe: null, ...(plan.produitReel ? { produitReel: true as const } : {}) };
  // Une liste qui aurait déjà une prise 1 (cas tordu : fiche restaurée) : l'ancienne prend un numéro libre.
  if (connues.some((prise) => prise.n === 1)) ancienne.n = prochainNumeroDePrise(connues);
  return [ancienne, ...connues].sort((a, b) => a.n - b.n);
}

export function prochainNumeroDePrise(prises: Prise[]): number {
  return Math.max(0, ...prises.map((prise) => prise.n)) + 1;
}

/** Le numéro de la prise retenue (celle que cite la fiche), ou null. */
export function numeroRetenu(prises: Prise[], plan: Pick<PlanDeCinema, "fichier">): number | null {
  return prises.find((prise) => prise.fichier === plan.fichier)?.n ?? null;
}
