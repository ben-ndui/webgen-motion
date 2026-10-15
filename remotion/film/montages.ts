import { type Plan, TEMPO_PAR_DEFAUT, dureeTotale } from "./lib/tempo";

// Les plans de la trame. Chacun a une raison d'être (voir le skill
// film-motion) : en retirer un se décide, ça ne s'oublie pas.
export type IdDePlan = "ouverture" | "probleme" | "bascule" | "parcours" | "evenement" | "marque" | "fin";

export type PlanDuFilm = Plan & { id: IdDePlan };

// La musique s'éteint sur la dernière mesure : fondu de sortie, en images.
export const FONDU_FINAL = 60;

// Les deux montages du film, en MESURES de la musique. Un plan a le même
// contenu dans les deux ; seule sa mise en page suit le cadre (lib/format.ts).
export type Version = "long" | "court";

type Montage = {
  plans: PlanDuFilm[];
  // Les plans qui ENTRENT par le glissement (bord adouci à 60°) : ceux où le
  // fond change, et l'arrivée de l'événement. Les autres coupent net, sur le
  // temps.
  glissements: ReadonlySet<IdDePlan>;
};

export const MONTAGES: Record<Version, Montage> = {
  // 16:9 : site, dossier commercial, fiche Google Play.
  long: {
    plans: [
      { id: "ouverture", mesures: 2 },
      { id: "probleme", mesures: 4 },
      { id: "bascule", mesures: 3 },
      { id: "parcours", mesures: 6 },
      { id: "evenement", mesures: 4 },
      { id: "marque", mesures: 2 },
      { id: "fin", mesures: 2 },
    ],
    glissements: new Set(["bascule", "evenement", "marque"]),
  },
  // 9:16 des réseaux. Il GARDE le problème : un inconnu qui fait défiler ne
  // sait pas pourquoi l'app existe sans le voir (leçon Kotizo, 05/10/2026).
  // VAGUA a pu le sauter parce que son court servait au démarchage ciblé, où
  // le destinataire connaît déjà le problème. Seule la marque (la coda) saute.
  court: {
    plans: [
      { id: "ouverture", mesures: 2 },
      { id: "probleme", mesures: 4 },
      { id: "bascule", mesures: 3 },
      { id: "parcours", mesures: 6 },
      { id: "evenement", mesures: 4 },
      { id: "fin", mesures: 2 },
    ],
    glissements: new Set(["bascule", "evenement", "fin"]),
  },
};

export function dureeDuFilm(version: Version, tempo: number = TEMPO_PAR_DEFAUT): number {
  return dureeTotale(MONTAGES[version].plans, tempo);
}
