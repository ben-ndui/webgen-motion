import { imageDuTemps, IMAGES_PAR_SECONDE, placerLesPlans } from "../../remotion/film/lib/tempo";
import { MONTAGES } from "../../remotion/film/montages";
import { type Repere, reperesDuFilm } from "../../remotion/film/reperes";
import type { DirectionDuFilm, FilmSpec, Langue, LigneDeVoix } from "../../remotion/film/spec";
import type { ResolvedVoiceBackend } from "./config";

/**
 * La voix off d'un film, sans rien générer : quelles répliques, à quels
 * repères, combien de temps chacune a avant la suivante, et quelle voix
 * selon la langue et le style. Module pur.
 */

/** Les repères des plans présents dans au moins un montage rendu. */
export function reperesMontes(fiche: FilmSpec, langue: Langue): Repere[] {
  const plans = new Set(fiche.declinaisons.flatMap((d) => MONTAGES[d.version].plans.map((p) => p.id as string)));
  return reperesDuFilm(fiche, langue).filter((r) => plans.has(r.plan));
}

/**
 * Secondes de parole par repère : jusqu'au repère suivant du même plan, ou
 * la fin du plan. Le plus court des montages rendus fait foi.
 */
export function tempsDeParole(fiche: FilmSpec, langue: Langue = "fr"): Record<string, number> {
  const tempo = fiche.musique.tempo;
  const reperes = reperesDuFilm(fiche, langue);
  const temps: Record<string, number> = {};
  for (const version of new Set(fiche.declinaisons.map((d) => d.version))) {
    for (const plan of placerLesPlans(MONTAGES[version].plans, tempo)) {
      const duPlan = reperes.filter((r) => r.plan === plan.id).sort((a, b) => a.temps - b.temps);
      duPlan.forEach((repere, i) => {
        const debut = imageDuTemps(repere.temps, tempo);
        const fin = i + 1 < duPlan.length ? imageDuTemps(duPlan[i + 1]!.temps, tempo) : plan.duree;
        const secondes = Math.max(0, (fin - debut) / IMAGES_PAR_SECONDE);
        temps[repere.cle] = temps[repere.cle] === undefined ? secondes : Math.min(temps[repere.cle]!, secondes);
      });
    }
  }
  return temps;
}

/**
 * Les répliques de départ : TOUT ce que l'image montre est dit, au moment où
 * elle le montre (choix de Ben, 12/10/2026) : le nom de la marque à
 * l'ouverture, la conversation, chaque étape. Un repère sans texte (logo
 * fourni en image) reste muet.
 */
export function lignesDeDepart(fiche: FilmSpec, langue: Langue): LigneDeVoix[] {
  return reperesMontes(fiche, langue)
    .filter((r) => r.texte.trim())
    .map((r) => ({ repere: r.cle, texte: r.texte.trim() }));
}

/** Le texte de départ d'un repère précis. */
export function phraseDeDepart(fiche: FilmSpec, langue: Langue, cle: string): string {
  return reperesDuFilm(fiche, langue).find((r) => r.cle === cle)?.texte.trim() ?? "";
}

/** Une réplique plus longue que le temps qu'elle a avant la suivante. */
export function ligneTropLongue(ligne: LigneDeVoix, temps: Record<string, number>): boolean {
  const dispo = temps[ligne.repere];
  return ligne.duree !== undefined && dispo !== undefined && ligne.duree > dispo;
}

// Le débit suit le style : posé en nocturne, vif en éditorial.
const DEBIT: Record<DirectionDuFilm, number> = { marque: 1, editorial: 1.08, nocturne: 0.9 };

// Voix Google par langue quand la configuration est réglée sur une autre langue.
const VOIX_GOOGLE: Record<Langue, { voice: string; languageCode: string }> = {
  fr: { voice: "fr-FR-Neural2-D", languageCode: "fr-FR" },
  en: { voice: "en-US-Neural2-J", languageCode: "en-US" },
};

/** Le moteur de voix réglé pour la langue ET le style du film. */
export function moteurPourLeFilm(moteur: ResolvedVoiceBackend, langue: Langue, direction: DirectionDuFilm = "marque"): ResolvedVoiceBackend {
  if (moteur.kind === "google") {
    const memeLangue = moteur.languageCode.toLowerCase().startsWith(langue);
    return { ...moteur, ...(memeLangue ? {} : VOIX_GOOGLE[langue]), speakingRate: DEBIT[direction] };
  }
  if (moteur.kind === "voicebox") return { ...moteur, language: langue };
  // ElevenLabs multilingue : la même voix parle les deux langues ; pas de réglage de débit.
  return moteur;
}
