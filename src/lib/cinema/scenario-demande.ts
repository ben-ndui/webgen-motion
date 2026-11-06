import type { CinemaDuFilm } from "../../../remotion/film/cinema/types";
import type { FilmSpec } from "../../../remotion/film/spec";
import { paletteEnMots } from "./couleurs";
import { DESCRIPTEUR_DU_STYLE } from "./styles";

/**
 * Ce qu'on demande à Claude pour écrire UN épisode à partir du brief de la
 * cliente. Module pur. Les textes visuels sont en anglais (Veo les suit
 * mieux), les répliques en français ; les personnages déjà là sont repris
 * par leur prénom, pour qu'ils gardent leur portrait d'un épisode à l'autre.
 */
export const LIMITES_DU_SCENARIO = { scenes: 4, plansParScene: 6, plansAuTotal: 10, personnagesParPlan: 3, replique: 100 } as const;

export type DemandeDeScenario = { systeme: string; message: string };

export function demandeDeScenario(spec: Pick<FilmSpec, "marque" | "direction" | "cinema">, brief: string): DemandeDeScenario {
  const { encre, accent, clair } = spec.marque.couleurs;
  const existants = spec.cinema?.personnages ?? [];
  const L = LIMITES_DU_SCENARIO;
  const systeme = [
    "You write short vertical drama episodes for a brand's social media, generated shot by shot by a video AI (Veo, 8 seconds per shot).",
    "Rules:",
    `- At most ${L.scenes} scenes, ${L.plansParScene} shots per scene, ${L.plansAuTotal} shots in total. One scene = one place.`,
    `- At most ${L.personnagesParPlan} characters in a shot. Characters are fictional adults.`,
    "- Settings, shot descriptions and character descriptions are in ENGLISH, concrete and visual (what the camera sees). One sentence each.",
    `- Lines of dialogue are in FRENCH, spoken by a character who is in the shot, at most ${L.replique} characters (8 seconds).`,
    "- Never put text, logos, labels or brand names in the image. Never invent facts about the product (no health or performance claims).",
    "- Reuse the existing characters by their exact first name when they fit; describe a new character only if the brief needs one.",
    "- If the brief contains a numbered shot list ('Shot 1: ...', 'Shot 2: ...', …), it is the client's OWN découpage: reuse each shot's action as the consigne of one plan, IN THE SAME ORDER, without inventing a different story. Group consecutive shots that happen in the same place into one scene (one scene = one place). If there are more shots than the limits above allow, keep the most important ones and merge the rest; never exceed the limits.",
    ...(spec.cinema?.negatif ? [`- Never show or describe: ${spec.cinema.negatif.trim()}.`] : []),
    "Answer with ONE JSON object and nothing else:",
    '{"titre": string (French episode title), "objet": string | null (the product, one English sentence, no brand name), "personnages": [{"nom": string, "description": string}], "scenes": [{"decor": string, "plans": [{"consigne": string, "personnages": [first names], "objet": boolean, "replique": {"personnage": first name, "texte": string} | null}]}]}',
  ].join("\n");
  const style = spec.cinema?.style && spec.cinema.style !== "photorealiste" ? DESCRIPTEUR_DU_STYLE[spec.cinema.style] : undefined;
  const message = [
    // La palette de la série remplace celle de la marque quand elle est décrite (même règle que le prompt des plans).
    `Brand: ${spec.marque.nom ?? "(no name given)"}. ${spec.cinema?.palette ? `Colors: ${spec.cinema.palette.trim().replace(/\.$/, "")}` : `Colors: ${paletteEnMots([encre, accent, clair])}`}. Mood: ${spec.direction ?? "marque"}.`,
    style ? `Visual style: ${style}` : "",
    existants.length > 0
      ? `Existing characters (reuse them, keep their exact first name):\n${existants.map((p) => `- ${p.nom}: ${p.description}`).join("\n")}`
      : "No characters exist yet.",
    spec.cinema?.objet ? `Existing product description (keep it): ${spec.cinema.objet}` : "",
    `Brief from the client (in French):\n${brief.trim()}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  return { systeme, message };
}

export type CinemaPropose = Pick<CinemaDuFilm, "personnages" | "objet" | "episodes">;
