import { type Plan, TEMPO_PAR_DEFAUT, dureeTotale } from "../lib/tempo";

// Les plans de la bibliothèque, enchaînés pour la revue et pour un reel qui
// les prend tels quels. Un film qui n'en veut qu'un le pioche dans
// Bibliotheque.tsx ; l'ordre ici est celui du Reel R1 de Smooth & Design.
export type IdDePlanDeBibliotheque = "typo" | "adresse" | "eventail" | "logo";

export type PlanDeBibliotheque = Plan & { id: IdDePlanDeBibliotheque };

export const MONTAGE_DE_LA_BIBLIOTHEQUE: {
  plans: PlanDeBibliotheque[];
  // Les plans qui entrent par le glissement : ceux où le fond change.
  glissements: ReadonlySet<IdDePlanDeBibliotheque>;
} = {
  plans: [
    // 6 temps de mot puis 6 d'anneau.
    { id: "typo", mesures: 3 },
    // Frappe (4 temps), validation, ouverture, le site se pose.
    { id: "adresse", mesures: 3 },
    // Montée, ouverture, puis une légende par temps : 4 + 5 = 9 temps au plus.
    { id: "eventail", mesures: 3 },
    { id: "logo", mesures: 2 },
  ],
  glissements: new Set(["eventail", "logo"]),
};

export function dureeDeLaBibliotheque(tempo: number = TEMPO_PAR_DEFAUT): number {
  return dureeTotale(MONTAGE_DE_LA_BIBLIOTHEQUE.plans, tempo);
}
