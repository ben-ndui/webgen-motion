import { decalageDeVoix } from "../../remotion/film/composants/VoixOff";
import { IMAGES_PAR_SECONDE, imagesParTemps, placerLesPlans } from "../../remotion/film/lib/tempo";
import { MONTAGES } from "../../remotion/film/montages";
import type { FilmSpec, Langue, LigneDeVoix } from "../../remotion/film/spec";
import type { ResolvedVoiceBackend } from "./config";

/**
 * Ce que l'assistant sait de la voix off d'un film, sans rien générer :
 * le temps de parole de chaque plan, les phrases de départ, et la voix à
 * utiliser selon la langue. Module pur.
 */
export const PLANS_PARLES = ["ouverture", "probleme", "bascule", "parcours", "evenement", "marque", "fin"] as const;
export type PlanParle = (typeof PLANS_PARLES)[number];

/**
 * Secondes de parole par plan : de l'entrée de la voix (un demi-temps après
 * le début du plan) à la fin du plan, dans le PLUS COURT des montages rendus
 * qui contiennent ce plan. Un plan absent de tous les montages n'y figure pas.
 */
export function tempsDeParole(fiche: FilmSpec): Partial<Record<PlanParle, number>> {
  const tempo = fiche.musique.tempo;
  const decalage = decalageDeVoix(imagesParTemps(tempo));
  const versions = [...new Set(fiche.declinaisons.map((d) => d.version))];
  const temps: Partial<Record<PlanParle, number>> = {};
  for (const version of versions) {
    for (const plan of placerLesPlans(MONTAGES[version].plans, tempo)) {
      const secondes = Math.max(0, (plan.duree - decalage) / IMAGES_PAR_SECONDE);
      const id = plan.id as PlanParle;
      temps[id] = temps[id] === undefined ? secondes : Math.min(temps[id]!, secondes);
    }
  }
  return temps;
}

/** « Choisir », « Sentir. » → « Choisir. Sentir. » : la voix marque une pause entre chaque. */
function enPhrases(morceaux: string[]): string {
  return morceaux
    .map((m) => m.trim().replace(/[.!?…]+$/, ""))
    .filter(Boolean)
    .map((m) => `${m}.`)
    .join(" ");
}

/**
 * Les phrases de départ : ce que le plan affiche déjà, à dire à voix haute,
 * pour les seuls plans des montages rendus.
 */
export function lignesDeDepart(fiche: FilmSpec, langue: Langue): LigneDeVoix[] {
  const t = fiche.textes[langue];
  const temps = tempsDeParole(fiche);
  const brouillons: [PlanParle, string][] = [
    ["bascule", enPhrases([t.bascule.constat, t.bascule.signature])],
    ["parcours", enPhrases(t.parcours)],
    ["evenement", t.evenement.chute],
    ["marque", enPhrases(t.marque.mots)],
    ["fin", t.fin.disponible],
  ];
  return brouillons
    .filter(([plan]) => temps[plan] !== undefined)
    .map(([plan, texte]) => ({ plan, texte: texte.replace(/\s+/g, " ").trim() }))
    .filter((l) => l.texte);
}

/** La phrase de départ d'un plan précis (y compris ceux qu'on ne pré-remplit pas). */
export function phraseDeDepart(fiche: FilmSpec, langue: Langue, plan: PlanParle): string {
  const proposee = lignesDeDepart(fiche, langue).find((l) => l.plan === plan)?.texte;
  if (proposee) return proposee;
  const t = fiche.textes[langue];
  if (plan === "probleme") return t.probleme.messages[0]?.texte ?? "";
  if (plan === "ouverture" && fiche.marque.logo.type === "motSymbole") return fiche.marque.logo.texte;
  return "";
}

/** Une ligne trop longue pour son plan (avec une marge pour respirer). */
export function ligneTropLongue(ligne: LigneDeVoix, temps: Partial<Record<PlanParle, number>>): boolean {
  const dispo = temps[ligne.plan as PlanParle];
  return ligne.duree !== undefined && dispo !== undefined && ligne.duree > dispo;
}

// Voix Google par langue quand la configuration est réglée sur une autre langue.
const VOIX_GOOGLE: Record<Langue, { voice: string; languageCode: string }> = {
  fr: { voice: "fr-FR-Neural2-D", languageCode: "fr-FR" },
  en: { voice: "en-US-Neural2-J", languageCode: "en-US" },
};

/** Le moteur de voix réglé pour parler la langue du film. */
export function moteurPourLaLangue(moteur: ResolvedVoiceBackend, langue: Langue): ResolvedVoiceBackend {
  if (moteur.kind === "google") {
    const memeLangue = moteur.languageCode.toLowerCase().startsWith(langue);
    return memeLangue ? moteur : { ...moteur, ...VOIX_GOOGLE[langue] };
  }
  if (moteur.kind === "voicebox") return { ...moteur, language: langue };
  // ElevenLabs multilingue : la même voix parle les deux langues.
  return moteur;
}
