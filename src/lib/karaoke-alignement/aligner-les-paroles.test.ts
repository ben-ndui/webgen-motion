import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { alignerLesParoles } from "./aligner-les-paroles";
import { cheminDuModeleDAlignement } from "./caler-par-alignement";
import type { Emission } from "./viterbi-ctc";

// Un alphabet de poche : 0 = blanc, puis o, u, i, a.
const MODELE = { alphabet: { o: 1, u: 2, i: 3, a: 4 }, blanc: 0 };
const TRAME = 0.02;

/** Une écoute qui entend nettement la suite donnée, une classe par trame. */
function ecouteOu(entendu: number[]): Emission {
  const classes = 5;
  const probas = new Float32Array(entendu.length * classes).fill(Math.log(0.01));
  entendu.forEach((classe, t) => {
    probas[t * classes + classe] = Math.log(0.96);
  });
  return { probas, trames: entendu.length, classes };
}

const blancs = (n: number) => new Array<number>(n).fill(0);
const tenue = (classe: number, n: number) => new Array<number>(n).fill(classe);

describe("poser les paroles écrites sur le morceau", () => {
  it("chaque mot prend le temps de ses lettres, les lignes gardent leurs respirations", () => {
    // « ou » de 0,2 s à 0,4 s, respiration, « ai » de 1,0 s à 1,2 s.
    const ecoute = ecouteOu([...blancs(10), ...tenue(1, 5), ...tenue(2, 5), ...blancs(30), ...tenue(4, 5), ...tenue(3, 5), ...blancs(10)]);
    const { lignes, reconnus, motsEtires } = alignerLesParoles(["ou", "ai"], ecoute, TRAME, MODELE);
    expect(lignes).toEqual([{ mots: [{ texte: "ou", debut: 0.2, fin: 0.4 }] }, { mots: [{ texte: "ai", debut: 1, fin: 1.2 }] }]);
    expect(reconnus).toBe(1);
    expect(motsEtires).toEqual([]);
  });

  it("un « mot » sans lettre (« ! ») se glisse entre ses voisins, sans durée inventée", () => {
    const ecoute = ecouteOu([...tenue(1, 5), ...blancs(10), ...tenue(4, 5)]);
    const [ligne] = alignerLesParoles(["o ! a"], ecoute, TRAME, MODELE).lignes;
    const [o, exclamation, a] = ligne!.mots;
    expect(exclamation!.texte).toBe("!");
    expect(exclamation!.debut).toBeGreaterThanOrEqual(o!.fin);
    expect(exclamation!.fin).toBeLessThanOrEqual(a!.debut);
  });

  it("un mot qui s'étire sur du chant non écrit est signalé, lui et sa ligne", () => {
    // Le texte dit « ou », puis « a ». Entre le « o » et le « u », 3 s de « i » chanté
    // mais pas écrit (des pics de lettre entre des blancs, comme l'entend le modèle) :
    // « ou » s'étale par-dessus, et ses deux lettres n'occupent presque rien de sa durée.
    const nonEcrit = Array.from({ length: 150 }, (_, t) => (t % 4 === 0 ? 3 : 0));
    const ecoute = ecouteOu([...tenue(1, 3), ...nonEcrit, ...tenue(2, 3), ...blancs(10), ...tenue(4, 5)]);
    const { lignes, motsEtires } = alignerLesParoles(["ou", "a"], ecoute, TRAME, MODELE);
    expect(lignes[0]!.mots[0]!.fin - lignes[0]!.mots[0]!.debut).toBeGreaterThan(3);
    expect(motsEtires).toEqual([{ ligne: 0, mot: 0 }]);
  });

  it("une note tenue n'est PAS un mot étiré : sa voyelle remplit sa durée", () => {
    const ecoute = ecouteOu([...blancs(5), ...tenue(1, 150), ...blancs(5), ...tenue(4, 5)]);
    const { motsEtires, reconnus } = alignerLesParoles(["o", "a"], ecoute, TRAME, MODELE);
    expect(motsEtires).toEqual([]);
    expect(reconnus).toBe(1);
  });

  it("des paroles qui ne sont pas celles du morceau tombent à presque rien de reconnu", () => {
    const ecoute = ecouteOu([...tenue(1, 20), ...blancs(10), ...tenue(2, 20)]);
    expect(alignerLesParoles(["ia ai"], ecoute, TRAME, MODELE).reconnus).toBe(0);
  });

  it("aucun mot n'a une durée nulle, même deux lettres collées sur une trame chacune", () => {
    const ecoute = ecouteOu([1, 4, ...blancs(20)]);
    const mots = alignerLesParoles(["o a"], ecoute, TRAME, MODELE).lignes[0]!.mots;
    for (const mot of mots) expect(mot.fin).toBeGreaterThan(mot.debut);
  });
});

describe("le modèle d'alignement sur l'ordinateur", () => {
  it("français seulement, et seulement s'il est là : sinon le calage reste à whisper", () => {
    const dossier = mkdtempSync(join(tmpdir(), "modeles-"));
    expect(cheminDuModeleDAlignement("fr", dossier)).toBeNull();
    mkdirSync(dossier, { recursive: true });
    writeFileSync(join(dossier, "alignement-fr-int8.onnx"), "x");
    expect(cheminDuModeleDAlignement("fr", dossier)).toBe(join(dossier, "alignement-fr-int8.onnx"));
    expect(cheminDuModeleDAlignement("en", dossier)).toBeNull();
    expect(cheminDuModeleDAlignement("auto", dossier)).toBeNull();
  });
});
