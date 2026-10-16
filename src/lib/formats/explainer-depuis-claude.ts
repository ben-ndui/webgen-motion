import type { Picto } from "../../../remotion/film/pictos";
import type { ExplainerSpec, MotsDuVisuel, SceneDeLExplainer, TextesDeScene, TypeDeVisuel } from "../../../remotion/film/explainer/spec";

/**
 * Transforme ce que Claude a rempli (OUTIL_EXPLAINER : une scène = visuel +
 * textes FR/EN côte à côte) en scènes et textes d'explainer. Le type des
 * « mots » est celui du visuel, posé par le CODE : un désaccord est impossible.
 * Un champ manquant reste vide, et la validation le nomme.
 */

type TexteRecu = {
  chapitre?: string; sousTitre?: string; precision?: string; valeur?: string; tampon?: string; lignes?: string[];
  gauche?: { titre?: string; detail?: string }; droite?: { titre?: string; detail?: string }; phrase?: string; motFort?: string;
};
type SceneRecue = { visuel?: TypeDeVisuel; picto?: Picto; pictoGauche?: Picto; pictoDroite?: Picto; fr?: TexteRecu; en?: TexteRecu };
type EntreeRecue = { scenes?: SceneRecue[]; signatureFr?: string; signatureEn?: string };

function mots(type: TypeDeVisuel, t: TexteRecu): MotsDuVisuel {
  switch (type) {
    case "chiffre":
      return { type, valeur: t.valeur ?? "" };
    case "tampon":
      return { type, tampon: t.tampon ?? "" };
    case "liste":
      return { type, elements: t.lignes ?? [] };
    case "opposition":
      return { type, gauche: { titre: t.gauche?.titre ?? "", detail: t.gauche?.detail ?? "" }, droite: { titre: t.droite?.titre ?? "", detail: t.droite?.detail ?? "" } };
    case "phrase":
      return { type, phrase: t.phrase ?? "", motFort: t.motFort ?? "" };
  }
}

function textes(type: TypeDeVisuel, t: TexteRecu = {}): TextesDeScene {
  const resultat: TextesDeScene = { chapitre: t.chapitre ?? "", mots: mots(type, t) };
  if (type !== "phrase") resultat.sousTitre = t.sousTitre ?? "";
  if (t.precision?.trim() && type !== "phrase") resultat.precision = t.precision;
  return resultat;
}

const MESURES: Record<TypeDeVisuel, number> = { chiffre: 3, opposition: 3, tampon: 3, liste: 3, phrase: 2 };

export function explainerDepuisClaude(entree: unknown): Pick<ExplainerSpec, "scenes" | "textes"> {
  const recue = (entree ?? {}) as EntreeRecue;
  const scenes: SceneDeLExplainer[] = [];
  const fr: Record<string, TextesDeScene> = {};
  const en: Record<string, TextesDeScene> = {};
  (recue.scenes ?? []).forEach((scene, index) => {
    const type = scene.visuel ?? "chiffre";
    const id = `scene-${index + 1}`;
    const visuel =
      type === "opposition" ? { type, gauche: scene.pictoGauche ?? "ecran", droite: scene.pictoDroite ?? "coche" }
      : type === "liste" ? { type }
      : { type, picto: scene.picto ?? "document" };
    scenes.push({ id, mesures: MESURES[type], visuel } as SceneDeLExplainer);
    fr[id] = textes(type, scene.fr);
    en[id] = textes(type, scene.en);
  });
  return { scenes, textes: { fr: { scenes: fr, signature: recue.signatureFr ?? "" }, en: { scenes: en, signature: recue.signatureEn ?? "" } } };
}
