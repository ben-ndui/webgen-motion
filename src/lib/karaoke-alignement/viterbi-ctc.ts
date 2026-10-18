/**
 * L'ALIGNEMENT FORCÉ : on connaît le texte, on cherche OÙ chaque lettre est chantée.
 *
 * Le modèle d'écoute donne, toutes les 20 ms (une « trame »), la probabilité de
 * chaque lettre et du « blanc » (rien de nouveau). On cherche le chemin le plus
 * probable qui lit les lettres DANS L'ORDRE, une lettre pouvant durer plusieurs
 * trames et être séparée de la suivante par des blancs : c'est l'algorithme de
 * Viterbi sur la grille CTC (même calcul que torchaudio.functional.forced_align,
 * vérifié sur le banc du 18/10/2026).
 *
 * Grille : les états sont « blanc, l1, blanc, l2, blanc, … lN, blanc » (2N+1).
 * D'une trame à l'autre on peut rester sur son état, passer au suivant, ou sauter
 * le blanc entre deux lettres DIFFÉRENTES (deux lettres identiques doivent être
 * séparées par un blanc, sinon « ll » se lirait « l »).
 */

export type Emission = { probas: Float32Array; trames: number; classes: number };
/** Une lettre du texte posée sur les trames [debut, fin[. */
export type LettrePosee = { debut: number; fin: number };
/**
 * `ecarts[t]` : ce que le modèle entendrait LIBREMENT à la trame t, moins ce que
 * le texte lui impose (en log-probabilité, ≥ 0). Proche de 0 quand le texte est
 * juste ; grand quand on lui fait lire des mots qui ne sont pas chantés là.
 */
export type Alignement = { lettres: LettrePosee[]; ecarts: Float32Array };

const IMPOSSIBLE = -Infinity;

export function alignerDeForce(emission: Emission, lettres: number[], blanc: number): Alignement {
  const { probas, trames, classes } = emission;
  const etats = 2 * lettres.length + 1;
  if (lettres.length === 0) return { lettres: [], ecarts: new Float32Array(trames) };
  if (trames < lettres.length) throw new Error("Le morceau est trop court pour ces paroles.");
  const classeDe = (etat: number) => (etat % 2 === 0 ? blanc : lettres[(etat - 1) / 2]!);
  const proba = (trame: number, etat: number) => probas[trame * classes + classeDe(etat)]!;

  // retour[t * etats + s] = de combien d'états on a avancé pour arriver en s à la trame t (0, 1 ou 2).
  const retour = new Uint8Array(trames * etats);
  let precedent = new Float64Array(etats).fill(IMPOSSIBLE);
  let courant = new Float64Array(etats);
  precedent[0] = proba(0, 0);
  if (etats > 1) precedent[1] = proba(0, 1);

  for (let t = 1; t < trames; t += 1) {
    courant.fill(IMPOSSIBLE);
    // Un état trop en avance ne peut plus finir le texte à temps : on ne le calcule pas.
    const premier = Math.max(0, etats - 2 * (trames - t));
    const dernier = Math.min(etats - 1, 2 * t + 1);
    for (let s = premier; s <= dernier; s += 1) {
      let meilleur = precedent[s]!;
      let pas = 0;
      if (s >= 1 && precedent[s - 1]! > meilleur) {
        meilleur = precedent[s - 1]!;
        pas = 1;
      }
      const sautPossible = s >= 2 && s % 2 === 1 && classeDe(s) !== classeDe(s - 2);
      if (sautPossible && precedent[s - 2]! > meilleur) {
        meilleur = precedent[s - 2]!;
        pas = 2;
      }
      if (meilleur === IMPOSSIBLE) continue;
      courant[s] = meilleur + proba(t, s);
      retour[t * etats + s] = pas;
    }
    [precedent, courant] = [courant, precedent];
  }

  // On finit sur la dernière lettre ou sur le blanc qui la suit.
  let s = etats > 1 && precedent[etats - 2]! > precedent[etats - 1]! ? etats - 2 : etats - 1;
  if (precedent[s] === IMPOSSIBLE) throw new Error("Aucun alignement possible entre ces paroles et ce morceau.");
  const chemin = new Int32Array(trames);
  for (let t = trames - 1; t >= 0; t -= 1) {
    chemin[t] = s;
    if (t > 0) s -= retour[t * etats + s]!;
  }
  const ecarts = new Float32Array(trames);
  for (let t = 0; t < trames; t += 1) {
    let libre = -Infinity;
    for (let c = 0; c < classes; c += 1) libre = Math.max(libre, probas[t * classes + c]!);
    ecarts[t] = libre - proba(t, chemin[t]!);
  }
  return { lettres: lettresDuChemin(chemin, lettres.length), ecarts };
}

/** Le chemin état par trame → pour chaque lettre, ses trames. */
function lettresDuChemin(chemin: Int32Array, nombre: number): LettrePosee[] {
  const posees: LettrePosee[] = Array.from({ length: nombre }, () => ({ debut: -1, fin: -1 }));
  for (let t = 0; t < chemin.length; t += 1) {
    const etat = chemin[t]!;
    if (etat % 2 === 0) continue;
    const lettre = posees[(etat - 1) / 2]!;
    if (lettre.debut < 0) lettre.debut = t;
    lettre.fin = t + 1;
  }
  return posees;
}
