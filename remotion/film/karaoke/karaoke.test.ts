import { describe, expect, it } from "vitest";

import { calerLesParoles, estUnMarqueur, jumeaux, lignesChantees, normaliser, recalerSurLesFenetres, type MotEntendu } from "./alignement";
import { KARAOKE } from "./ficheKaraoke";
import { ANTICIPATION, SILENCE_MAX, ligneEnCours, lignesDuPassage, remplissage } from "./lecture";
import type { KaraokeSpec, ParolesDuKaraoke } from "./spec";
import { erreursDesParoles, erreursDuKaraoke } from "./validerKaraoke";

const entendus = (texte: string, depart = 10, pas = 0.5): MotEntendu[] =>
  texte.split(" ").map((mot, i) => ({ texte: mot, debut: depart + i * pas, fin: depart + (i + 1) * pas }));

describe("caler les paroles", () => {
  it("normalise sans casse, accent ni ponctuation", () => {
    expect(normaliser("L'Époque,")).toBe("lepoque");
  });

  it("reconnaît les marqueurs que whisper invente sur la musique", () => {
    expect(estUnMarqueur("*Musique*")).toBe(true);
    expect(estUnMarqueur("[Applaudissements]")).toBe(true);
    expect(estUnMarqueur("♪")).toBe(true);
    expect(estUnMarqueur("Amigo")).toBe(false);
  });

  it("aligne deux suites dans l'ordre, refrain répété compris", () => {
    expect(jumeaux(["a", "b", "a", "b"], ["a", "x", "b", "a", "b"])).toEqual([0, 2, 3, 4]);
  });

  it("garde le TEXTE de l'artiste et le TEMPS de whisper", () => {
    const { lignes, reconnus } = calerLesParoles(["sans frein, sans un baromètre"], entendus("*Musique* sans froid sans un baromètre"));
    expect(lignes[0]!.mots.map((m) => m.texte)).toEqual(["sans", "frein,", "sans", "un", "baromètre"]);
    // « frein » n'a pas été entendu : il prend la place de « froid », entre ses voisins.
    expect(lignes[0]!.mots[1]!.debut).toBeCloseTo(11);
    expect(lignes[0]!.mots[1]!.fin).toBeCloseTo(11.5);
    expect(reconnus).toBeCloseTo(4 / 5);
  });

  it("dit quand le texte ne correspond pas au morceau", () => {
    const { reconnus } = calerLesParoles(["rien à voir ici"], entendus("on s'est donné rendez-vous"));
    expect(reconnus).toBe(0);
  });
});

describe("le texte de l'artiste, tel qu'il l'écrit", () => {
  it("garde les lignes chantées : ni repères de section, ni lignes vides, ni virgule de fin", () => {
    const texte = "[ Refrain ]\n\nOn s'est donné rendez-vous y a dix ans,\nA l'époque, on avait pas de plan\n(Couplet)\nMais face au miroir, que restera-t-il ?\n";
    expect(lignesChantees(texte)).toEqual(["On s'est donné rendez-vous y a dix ans", "A l'époque, on avait pas de plan", "Mais face au miroir, que restera-t-il ?"]);
  });
});

describe("recaler sur les écoutes courtes", () => {
  // Whisper sur le morceau entier : une grille trop régulière, qui prend du retard.
  const lisse = entendus("on a fait des kilometres", 20, 2);

  it("prend le temps de la fenêtre où le mot tombe loin des bords", () => {
    const fenetre = { debut: 18, fin: 28, mots: entendus("on a fait des kilometres", 20.1, 2.14) };
    const recale = recalerSurLesFenetres(lisse, [fenetre]);
    // Les trois premiers prennent le temps de la fenêtre ; les deux derniers tombent dans son
    // bord (après 26,5 s) et gardent le décalage du troisième (+0,38 s).
    const attendus = [20.1, 22.24, 24.38, 26.38, 28.38];
    recale.forEach((mot, i) => expect(mot.debut).toBeCloseTo(attendus[i]!));
  });

  it("ignore le mot collé au bord d'une fenêtre, et garde le décalage du voisin", () => {
    const bord = { debut: 20, fin: 30, mots: [{ texte: "on", debut: 20, fin: 20.2 }, { texte: "a", debut: 22.3, fin: 22.5 }] };
    const recale = recalerSurLesFenetres(lisse.slice(0, 3), [bord]);
    expect(recale[0]!.debut).toBe(20);
    expect(recale[1]!.debut).toBe(22.3);
    expect(recale[2]!.debut).toBeCloseTo(24.3);
  });

  it("ne remonte jamais le temps", () => {
    const fausse = { debut: 10, fin: 40, mots: [{ texte: "a", debut: 19, fin: 19.2 }] };
    const recale = recalerSurLesFenetres(lisse.slice(0, 2), [fausse]);
    expect(recale[1]!.debut).toBeGreaterThanOrEqual(recale[0]!.debut);
  });
});

describe("ce qui s'affiche", () => {
  const lignes = [
    { mots: [{ texte: "un", debut: 1, fin: 2 }] },
    { mots: [{ texte: "deux", debut: 3, fin: 4 }] },
    { mots: [{ texte: "trois", debut: 20, fin: 21 }] },
  ];

  it("montre la ligne un peu avant qu'elle soit chantée", () => {
    expect(ligneEnCours(lignes, 1 - ANTICIPATION - 0.01)).toBe(-1);
    expect(ligneEnCours(lignes, 1 - ANTICIPATION + 0.01)).toBe(0);
    expect(ligneEnCours(lignes, 2.9)).toBe(1);
  });

  it("efface la ligne pendant un pont instrumental", () => {
    expect(ligneEnCours(lignes, 4 + SILENCE_MAX - 0.1)).toBe(1);
    expect(ligneEnCours(lignes, 4 + SILENCE_MAX + 0.1)).toBe(-1);
  });

  it("remplit le mot au rythme du chant", () => {
    const mot = { texte: "x", debut: 2, fin: 4 };
    expect(remplissage(mot, 1)).toBe(0);
    expect(remplissage(mot, 3)).toBe(0.5);
    expect(remplissage(mot, 5)).toBe(1);
  });

  it("ne garde que les lignes du passage, recalées sur son début", () => {
    expect(lignesDuPassage(lignes, 2.5, 10)).toEqual([{ mots: [{ texte: "deux", debut: 0.5, fin: 1.5 }] }]);
  });
});

describe("la garde du karaoké", () => {
  const copie = () => JSON.parse(JSON.stringify(KARAOKE)) as KaraokeSpec;
  const paroles = (source: string): ParolesDuKaraoke => ({
    source,
    reconnus: 1,
    lignes: [{ mots: [{ texte: "on", debut: 17.4, fin: 17.6 }] }],
  });

  it("accepte la fiche d'exemple", () => {
    expect(erreursDuKaraoke(copie())).toEqual([]);
  });

  it("refuse en livraison des paroles calées sur le brouillon de whisper", () => {
    expect(erreursDesParoles(paroles("paroles-brouillon.txt"), copie(), false)).toEqual([]);
    expect(erreursDesParoles(paroles("paroles-brouillon.txt"), copie(), true)[0]).toMatch(/brouillon de whisper/);
    expect(erreursDesParoles(paroles("10-ans.txt"), copie(), true)).toEqual([]);
  });

  it("refuse un passage où rien n'est chanté", () => {
    const spec = copie();
    spec.morceau.debut = 0;
    spec.morceau.fin = 10;
    expect(erreursDesParoles(paroles("10-ans.txt"), spec, true)).toContain(
      "paroles : aucune ligne chantée dans le passage retenu (morceau.debut / morceau.fin)",
    );
  });

  it("exige un passage d'au moins 5 s et un tempo mesuré", () => {
    const spec = copie() as unknown as { morceau: Record<string, unknown> };
    spec.morceau.fin = (spec.morceau.debut as number) + 2;
    spec.morceau.tempo = 0;
    const erreurs = erreursDuKaraoke(spec);
    expect(erreurs).toContain("morceau.fin : au moins 5 s après le début");
    expect(erreurs).toContain("morceau.tempo : nombre ≥ 40");
  });
});
