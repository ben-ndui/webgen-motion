// Calculs purs de l'analyse rythmique, repris du gabarit film-motion du brain
// (scripts/rythme.mjs, éprouvé sur les films VAGUA et Kotizo). Aucune lecture
// de fichier ici : ils s'éprouvent sur un signal fabriqué (film-rythme.test.ts).

/**
 * Enveloppe d'attaques : pour chaque fenêtre, de combien l'énergie MONTE par
 * rapport à la précédente. Une grosse caisse, un claquement, une attaque de
 * basse font monter l'énergie d'un coup ; une note tenue, non.
 */
export function enveloppeDAttaques(echantillons: Float32Array, tailleFenetre: number) {
  const nombre = Math.floor(echantillons.length / tailleFenetre);
  const energies = new Float64Array(nombre);
  for (let i = 0; i < nombre; i += 1) {
    let somme = 0;
    for (let j = 0; j < tailleFenetre; j += 1) {
      const v = echantillons[i * tailleFenetre + j];
      somme += v * v;
    }
    energies[i] = Math.sqrt(somme / tailleFenetre);
  }
  const attaques = new Float64Array(nombre);
  for (let i = 1; i < nombre; i += 1) {
    attaques[i] = Math.max(0, energies[i] - energies[i - 1]);
  }
  return { energies, attaques };
}

/**
 * Tempo le plus probable entre `min` et `max` BPM : celui dont l'écart entre
 * deux temps fait le mieux coïncider l'enveloppe avec elle-même
 * (autocorrélation).
 *
 * Attention : on cherche dans une fourchette ÉTROITE, et c'est voulu : l'autocorrélation
 * répond aussi volontiers au double ou à la moitié du vrai tempo (58 ou 232
 * pour un morceau à 116). Hors fourchette, le résultat serait « juste » et
 * inutilisable.
 */
export function estimerLeTempo(attaques: Float64Array, fenetresParSeconde: number, min = 90, max = 140): number {
  let meilleur = { tempo: 0, score: -Infinity };
  for (let dixiemes = min * 10; dixiemes <= max * 10; dixiemes += 1) {
    const tempo = dixiemes / 10;
    const ecart = (60 / tempo) * fenetresParSeconde;
    let score = 0;
    for (let i = 0; i + ecart + 1 < attaques.length; i += 1) {
      // Interpolation : l'écart d'un temps tombe rarement sur une fenêtre entière.
      const position = i + ecart;
      const bas = Math.floor(position);
      const fraction = position - bas;
      const decale = attaques[bas] * (1 - fraction) + attaques[bas + 1] * fraction;
      score += attaques[i] * decale;
    }
    if (score > meilleur.score) {
      meilleur = { tempo, score };
    }
  }
  return meilleur.tempo;
}

/**
 * Où tombe le PREMIER temps : le décalage (en secondes, dans le premier temps)
 * qui fait coïncider la grille avec le plus d'attaques.
 */
export function caleLaGrille(attaques: Float64Array, fenetresParSeconde: number, tempo: number): number {
  const dureeDuTemps = 60 / tempo;
  const pas = 1 / fenetresParSeconde;
  let meilleur = { decalage: 0, score: -Infinity };
  for (let decalage = 0; decalage < dureeDuTemps; decalage += pas) {
    let score = 0;
    for (let t = decalage; t * fenetresParSeconde < attaques.length; t += dureeDuTemps) {
      score += attaques[Math.round(t * fenetresParSeconde)] ?? 0;
    }
    if (score > meilleur.score) {
      meilleur = { decalage, score };
    }
  }
  return meilleur.decalage;
}

/** Volume moyen de chaque mesure, pour voir où le morceau « monte ». */
export function volumeParMesure(energies: Float64Array, fenetresParSeconde: number, tempo: number, decalage: number): number[] {
  const dureeDeMesure = (60 / tempo) * 4;
  const volumes: number[] = [];
  for (let debut = decalage; debut * fenetresParSeconde < energies.length; debut += dureeDeMesure) {
    const de = Math.round(debut * fenetresParSeconde);
    const a = Math.min(energies.length, Math.round((debut + dureeDeMesure) * fenetresParSeconde));
    let somme = 0;
    for (let i = de; i < a; i += 1) somme += energies[i];
    volumes.push(a > de ? somme / (a - de) : 0);
  }
  return volumes;
}

// Score d'une grille (tempo + premier temps) : la somme des attaques qui
// tombent sur ses temps, sur TOUTE la durée du morceau.
function scoreDeLaGrille(attaques: Float64Array, fenetresParSeconde: number, tempo: number, decalage: number): number {
  const dureeDuTemps = 60 / tempo;
  let score = 0;
  for (let t = decalage; t * fenetresParSeconde < attaques.length - 1; t += dureeDuTemps) {
    const position = t * fenetresParSeconde;
    const bas = Math.floor(position);
    const fraction = position - bas;
    score += attaques[bas] * (1 - fraction) + (attaques[bas + 1] ?? 0) * fraction;
  }
  return score;
}

/**
 * Affine un tempo au centième près, en cherchant tempo ET premier temps
 * ensemble autour de l'estimation.
 *
 * Attention, pourquoi : l'autocorrélation compare des fenêtres voisines, sa précision
 * plafonne vers 0,8 BPM. Sur un film de 60 s, 0,8 BPM d'erreur décale la
 * dernière coupe d'un demi-temps : elle tombe à côté de la musique. Une
 * grille qui doit coïncider avec les attaques pendant DEUX MINUTES, elle, ne
 * tolère pas l'erreur.
 */
export function affinerLeTempo(
  attaques: Float64Array,
  fenetresParSeconde: number,
  tempoApproche: number,
): { tempo: number; decalage: number } {
  let meilleur = { tempo: tempoApproche, decalage: 0, score: -Infinity };
  for (let tempo = tempoApproche - 1.5; tempo <= tempoApproche + 1.5; tempo += 0.02) {
    const dureeDuTemps = 60 / tempo;
    for (let decalage = 0; decalage < dureeDuTemps; decalage += 0.25 / fenetresParSeconde) {
      const score = scoreDeLaGrille(attaques, fenetresParSeconde, tempo, decalage);
      if (score > meilleur.score) {
        meilleur = { tempo, decalage, score };
      }
    }
  }
  return { tempo: Math.round(meilleur.tempo * 100) / 100, decalage: meilleur.decalage };
}
