import { describe, expect, it } from "vitest";

import {
  affinerLeTempo,
  caleLaGrille,
  enveloppeDAttaques,
  estimerLeTempo,
  volumeParMesure,
} from "./film-rythme";

const FREQUENCE = 8000;
const FENETRE = 128;
const FENETRES_PAR_SECONDE = FREQUENCE / FENETRE;

// Un métronome : un claquement bref à chaque temps, à partir de `decalage` s.
function metronome(tempo: number, secondes: number, decalage = 0): Float32Array {
  const signal = new Float32Array(FREQUENCE * secondes);
  for (let t = decalage; t < secondes; t += 60 / tempo) {
    const debut = Math.round(t * FREQUENCE);
    for (let i = 0; i < 200 && debut + i < signal.length; i += 1) {
      signal[debut + i] = 0.9;
    }
  }
  return signal;
}

describe("analyse rythmique", () => {
  it("approche le tempo d'un métronome à 1,5 BPM près", () => {
    const { attaques } = enveloppeDAttaques(metronome(118, 30), FENETRE);
    expect(Math.abs(estimerLeTempo(attaques, FENETRES_PAR_SECONDE) - 118)).toBeLessThanOrEqual(1.5);
  });

  it("l'affinage retrouve le tempo au dixième près, et le premier temps", () => {
    const { attaques } = enveloppeDAttaques(metronome(118.3, 90, 0.31), FENETRE);
    const approche = estimerLeTempo(attaques, FENETRES_PAR_SECONDE);
    const { tempo, decalage } = affinerLeTempo(attaques, FENETRES_PAR_SECONDE, approche);
    expect(Math.abs(tempo - 118.3)).toBeLessThanOrEqual(0.1);
    expect(Math.abs(decalage - 0.31)).toBeLessThan(0.02);
  });

  it("ne répond pas le double tempo quand il sort de la fourchette", () => {
    const { attaques } = enveloppeDAttaques(metronome(112, 30), FENETRE);
    const tempo = estimerLeTempo(attaques, FENETRES_PAR_SECONDE, 90, 140);
    expect(tempo).toBeGreaterThan(100);
    expect(tempo).toBeLessThan(125);
  });

  it("cale la grille sur le premier claquement", () => {
    const { attaques } = enveloppeDAttaques(metronome(120, 20, 0.2), FENETRE);
    // La fenêtre fait 16 ms : on tolère une fenêtre d'écart.
    expect(Math.abs(caleLaGrille(attaques, FENETRES_PAR_SECONDE, 120) - 0.2)).toBeLessThan(0.02);
  });

  it("rend une liste vide de volumes pour un silence de zéro seconde", () => {
    expect(volumeParMesure(new Float64Array(0), FENETRES_PAR_SECONDE, 120, 0)).toEqual([]);
  });
});
