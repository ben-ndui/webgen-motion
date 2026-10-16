import type { ExplainerSpec } from "../../../remotion/film/explainer/spec";

/**
 * Ce qu'on demande à Claude pour écrire un explainer : le contrat du format
 * (scènes, visuels, longueurs) et les règles maison. Séparé de l'appel pour
 * se relire et se tester seul.
 */

export const LONGUEURS = { chapitre: 30, sousTitre: 90, precision: 80, valeur: 12, tampon: 14, ligne: 60, phrase: 70, carteTitre: 22, carteDetail: 28, signature: 50 } as const;

const PICTOS_PERMIS = ["robot", "document", "formulaire", "cadenas", "loupe", "personne", "serveur", "ecran", "horloge", "coche"];

const TEXTE_D_UNE_SCENE = {
  type: "object",
  properties: {
    chapitre: { type: "string", description: `La pastille du haut, ${LONGUEURS.chapitre} caractères au plus` },
    sousTitre: { type: "string", description: `L'encadré du bas, ${LONGUEURS.sousTitre} au plus. Vide pour la phrase finale.` },
    precision: { type: "string", description: `Facultatif : une deuxième ligne d'encadré, ${LONGUEURS.precision} au plus` },
    valeur: { type: "string", description: `Visuel « chiffre » : le chiffre en grand, ${LONGUEURS.valeur} au plus` },
    tampon: { type: "string", description: `Visuel « tampon » : un mot court, ${LONGUEURS.tampon} au plus` },
    lignes: { type: "array", items: { type: "string" }, description: `Visuel « liste » : 2 à 4 lignes de ${LONGUEURS.ligne} au plus` },
    gauche: { type: "object", properties: { titre: { type: "string" }, detail: { type: "string" } }, description: "Visuel « opposition » : ce qu'on croit (carte barrée)" },
    droite: { type: "object", properties: { titre: { type: "string" }, detail: { type: "string" } }, description: "Visuel « opposition » : ce qui est" },
    phrase: { type: "string", description: `Visuel « phrase » : la phrase à retenir, ${LONGUEURS.phrase} au plus` },
    motFort: { type: "string", description: "Visuel « phrase » : un morceau EXACT de la phrase, mis en couleur" },
  },
  required: ["chapitre"],
};

/** L'outil que Claude remplit : une scène = son visuel ET ses textes FR et EN, côte à côte. */
export const OUTIL_EXPLAINER = {
  name: "proposer_un_explainer",
  description: "Propose les scènes d'un explainer (4 à 6), la dernière étant une phrase à retenir, et la signature, en français et en anglais.",
  input_schema: {
    type: "object",
    properties: {
      scenes: {
        type: "array",
        minItems: 4,
        maxItems: 6,
        items: {
          type: "object",
          properties: {
            visuel: { type: "string", enum: ["chiffre", "opposition", "tampon", "liste", "phrase"] },
            picto: { type: "string", enum: PICTOS_PERMIS, description: "Pour chiffre, tampon et phrase" },
            pictoGauche: { type: "string", enum: PICTOS_PERMIS, description: "Pour opposition" },
            pictoDroite: { type: "string", enum: PICTOS_PERMIS, description: "Pour opposition" },
            fr: TEXTE_D_UNE_SCENE,
            en: TEXTE_D_UNE_SCENE,
          },
          required: ["visuel", "fr", "en"],
        },
      },
      signatureFr: { type: "string", description: `La ligne sous le nom, à la fin, ${LONGUEURS.signature} au plus` },
      signatureEn: { type: "string" },
    },
    required: ["scenes", "signatureFr", "signatureEn"],
  },
};

export function demandeDExplainer(spec: ExplainerSpec, sujet: string, notes: string): { systeme: string; message: string } {
  const systeme = `Tu écris une vidéo « explainer » de 20 à 40 secondes, en français ET en anglais, avec l'outil proposer_un_explainer.
Chaque scène : une pastille de chapitre, un visuel au centre, un sous-titre encadré. Elle se comprend SANS le son.
Remplis, pour chaque scène, UNIQUEMENT les champs de son visuel (valeur pour chiffre, tampon pour tampon, lignes pour liste, gauche et droite pour opposition, phrase et motFort pour phrase).
La dernière scène est une « phrase », sans sous-titre ; aucune autre ne l'est.
N'utilise QUE les faits des notes : aucun chiffre, aucune date, aucun nom qui n'y figure pas. Sans chiffre dans les notes, pas de visuel « chiffre ».
Phrases courtes et directes, tutoiement. Jamais de tiret cadratin, jamais d'emoji. L'anglais dit la même chose, sans traduire mot à mot.`;
  const message = `Marque : ${spec.marque.nom ?? ""}
Sujet de la vidéo : ${sujet.trim()}

Notes (les SEULS faits utilisables) :
${notes.trim()}`;
  return { systeme, message };
}

/** Les nombres d'un texte, normalisés (« 70 000 » et « 70000 » sont le même ; « 3,5 » et « 3.5 » aussi). */
export function nombresDe(texte: string): string[] {
  const trouves = texte.match(/\d[\d\s  ]*(?:[.,]\d+)?/g) ?? [];
  return trouves.map((n) => n.replace(/[\s  ]/g, "").replace(",", ".")).filter(Boolean);
}

/** Les VALEURS texte d'un objet (jamais ses clés : « scene-2 » n'est pas un chiffre écrit). */
function valeursTexte(valeur: unknown): string[] {
  if (typeof valeur === "string") return [valeur];
  if (Array.isArray(valeur)) return valeur.flatMap(valeursTexte);
  if (typeof valeur === "object" && valeur !== null) return Object.values(valeur).flatMap(valeursTexte);
  return [];
}

/** Les nombres écrits par Claude qui ne figurent pas dans les notes : un chiffre inventé ne passe jamais. */
export function nombresInventes(textes: unknown, notes: string): string[] {
  const connus = new Set(nombresDe(notes));
  const ecrits = valeursTexte(textes).flatMap(nombresDe);
  return [...new Set(ecrits.filter((n) => !connus.has(n)))];
}
