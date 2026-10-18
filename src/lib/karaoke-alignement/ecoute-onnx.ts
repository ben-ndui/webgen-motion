/**
 * Faire écouter un morceau au modèle d'alignement (ONNX, onnxruntime-node), EN
 * LOCAL. SERVEUR SEULEMENT.
 *
 * L'attention du modèle coûte le CARRÉ de la durée écoutée : 4 minutes d'un
 * coup demandaient ~9 Go. On écoute donc par fenêtres de 20 s qui se recouvrent
 * de 2 s, et chaque fenêtre ne garde que son milieu, là où le modèle entend du
 * contexte des deux côtés (banc du 18/10/2026 : aucune perte de précision).
 *
 * La couture se calcule sur le PAS du modèle (une trame tous les 320
 * échantillons), pas sur le nombre de trames rendues : wav2vec2 rend une trame
 * de moins que durée / pas (sa première convolution lit 400 échantillons), et
 * une règle de trois perdait une trame à chaque jointure (relecture du 18/10).
 */

import type { Emission } from "./viterbi-ctc";

export const TAUX = 16_000;
export const FENETRE = 20 * TAUX;
export const RECOUVREMENT = 2 * TAUX;

/** Une écoute d'un extrait : log-probabilités, `trames` × `classes`. */
export type Ecouteur = (extrait: Float32Array) => Promise<Emission>;
export type Avancement = (fraction: number) => void;

export async function ecouterParFenetres(
  onde: Float32Array,
  ecouter: Ecouteur,
  echantillonsParTrame: number,
  avancer: Avancement = () => {},
): Promise<{ emission: Emission; secondesParTrame: number }> {
  if (onde.length === 0) throw new Error("Le morceau est vide.");
  const morceaux: Float32Array[] = [];
  let classes = 0;
  const pas = FENETRE - RECOUVREMENT;
  const demiRecouvrement = RECOUVREMENT / 2 / echantillonsParTrame;
  for (let debut = 0; ; debut += pas) {
    const fin = Math.min(debut + FENETRE, onde.length);
    const emission = await ecouter(onde.subarray(debut, fin));
    classes = emission.classes;
    const derniere = fin === onde.length;
    // Trames gardées : [début + 1 s, début + 19 s[ en temps du morceau (tout au bord pour la première et la dernière).
    const garderDe = debut === 0 ? 0 : demiRecouvrement;
    const garderJusqua = derniere ? emission.trames : (FENETRE - RECOUVREMENT / 2) / echantillonsParTrame;
    morceaux.push(emission.probas.subarray(garderDe * classes, Math.min(garderJusqua, emission.trames) * classes));
    avancer(fin / onde.length);
    if (derniere) break;
  }
  const probas = new Float32Array(morceaux.reduce((total, m) => total + m.length, 0));
  let position = 0;
  for (const morceau of morceaux) {
    probas.set(morceau, position);
    position += morceau.length;
  }
  return { emission: { probas, trames: probas.length / classes, classes }, secondesParTrame: echantillonsParTrame / TAUX };
}

/**
 * L'écouteur réel : une session onnxruntime sur le fichier du modèle (chargée
 * une fois). Un fichier qui n'a pas l'alphabet attendu est refusé : ses
 * numéros de lettres ne voudraient rien dire.
 */
export async function ecouteurOnnx(cheminDuModele: string, classesAttendues: number): Promise<Ecouteur> {
  const ort = await import("onnxruntime-node");
  const session = await ort.InferenceSession.create(cheminDuModele);
  return async (extrait) => {
    const entree = new ort.Tensor("float32", Float32Array.from(extrait), [1, extrait.length]);
    const { emission } = await session.run({ onde: entree });
    if (!emission) throw new Error("Le modèle d'alignement n'a rien rendu.");
    const [, trames, classes] = emission.dims as number[];
    if (classes !== classesAttendues) throw new Error(`Le modèle d'alignement n'a pas l'alphabet attendu (${classes} lettres au lieu de ${classesAttendues}).`);
    return { probas: emission.data as Float32Array, trames: trames!, classes };
  };
}
