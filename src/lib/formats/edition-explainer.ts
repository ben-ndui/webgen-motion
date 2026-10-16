import type { Picto } from "../../../remotion/film/pictos";
import type { Langue } from "../../../remotion/film/spec";
import type { ExplainerSpec, MotsDuVisuel, SceneDeLExplainer, TypeDeVisuel, VisuelDeScene } from "../../../remotion/film/explainer/spec";

/**
 * Modifier les scènes d'un explainer sans jamais désaccorder ses deux langues :
 * une scène ajoutée, retirée, déplacée ou changée de visuel l'est dans les
 * textes FR ET EN, dans le même geste. Fonctions pures, sur une copie.
 */

const LANGUES: Langue[] = ["fr", "en"];
const PICTO_PAR_DEFAUT: Picto = "document";

export function visuelParDefaut(type: TypeDeVisuel): VisuelDeScene {
  switch (type) {
    case "opposition":
      return { type, gauche: "ecran", droite: "formulaire" };
    case "liste":
      return { type };
    default:
      return { type, picto: PICTO_PAR_DEFAUT };
  }
}

/** Des mots vides du bon type : la scène est « à écrire », la validation le dit champ par champ. */
export function motsParDefaut(type: TypeDeVisuel): MotsDuVisuel {
  switch (type) {
    case "chiffre":
      return { type, valeur: "" };
    case "opposition":
      return { type, gauche: { titre: "", detail: "" }, droite: { titre: "", detail: "" } };
    case "tampon":
      return { type, tampon: "" };
    case "liste":
      return { type, elements: ["", ""] };
    case "phrase":
      return { type, phrase: "", motFort: "" };
  }
}

// Assez pour lire chaque visuel par défaut (rythme.ts) : une liste de 2 lignes tient en 2 mesures.
const MESURES_PAR_DEFAUT: Record<TypeDeVisuel, number> = { chiffre: 3, opposition: 2, tampon: 3, liste: 2, phrase: 2 };

function idLibre(spec: ExplainerSpec): string {
  let n = spec.scenes.length + 1;
  while (spec.scenes.some((s) => s.id === `scene-${n}`)) n += 1;
  return `scene-${n}`;
}

/** Ajoute une scène vide après `apres` (-1 : au début). La phrase finale reste la dernière. */
export function ajouterUneScene(spec: ExplainerSpec, apres: number, type: TypeDeVisuel = "chiffre"): ExplainerSpec {
  const copie = structuredClone(spec);
  const scene: SceneDeLExplainer = { id: idLibre(copie), mesures: MESURES_PAR_DEFAUT[type], visuel: visuelParDefaut(type) };
  const derniere = copie.scenes.length - 1;
  const position = Math.min(apres + 1, copie.scenes[derniere]?.visuel.type === "phrase" ? derniere : copie.scenes.length);
  copie.scenes.splice(Math.max(0, position), 0, scene);
  for (const langue of LANGUES) copie.textes[langue].scenes[scene.id] = { chapitre: "", sousTitre: "", mots: motsParDefaut(type) };
  return copie;
}

/** Retire une scène et ses textes. On garde au moins deux scènes (la validation l'exige). */
export function retirerUneScene(spec: ExplainerSpec, id: string): ExplainerSpec {
  if (spec.scenes.length <= 2) return spec;
  const copie = structuredClone(spec);
  copie.scenes = copie.scenes.filter((s) => s.id !== id);
  for (const langue of LANGUES) delete copie.textes[langue].scenes[id];
  return copie;
}

export function deplacerUneScene(spec: ExplainerSpec, id: string, sens: -1 | 1): ExplainerSpec {
  const index = spec.scenes.findIndex((s) => s.id === id);
  const cible = index + sens;
  if (index < 0 || cible < 0 || cible >= spec.scenes.length) return spec;
  const copie = structuredClone(spec);
  const [scene] = copie.scenes.splice(index, 1);
  copie.scenes.splice(cible, 0, scene!);
  return copie;
}

/** Change le visuel d'une scène : ses mots repartent vides, du nouveau type, dans les deux langues. */
export function changerLeVisuel(spec: ExplainerSpec, id: string, type: TypeDeVisuel): ExplainerSpec {
  const copie = structuredClone(spec);
  const scene = copie.scenes.find((s) => s.id === id);
  if (!scene || scene.visuel.type === type) return spec;
  scene.visuel = visuelParDefaut(type);
  scene.mesures = Math.max(scene.mesures, MESURES_PAR_DEFAUT[type]);
  for (const langue of LANGUES) {
    const textes = copie.textes[langue].scenes[id];
    if (textes) {
      textes.mots = motsParDefaut(type);
      if (type === "phrase") delete textes.sousTitre;
      else textes.sousTitre ??= "";
    }
  }
  return copie;
}
