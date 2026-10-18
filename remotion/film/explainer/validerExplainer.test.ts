import { describe, expect, it } from "vitest";

import { EXPLAINER } from "./ficheExplainer";
import { dernierTemps, plansDeLExplainer, scenesTropCourtes } from "./rythme";
import { PICTOS } from "../pictos";
import { TYPES_DE_VISUEL, type ExplainerSpec } from "./spec";
import { PICTOS_CONNUS, TYPES_CONNUS, erreursDeLExplainer } from "./validerExplainer";

function copie(): ExplainerSpec {
  return JSON.parse(JSON.stringify(EXPLAINER)) as ExplainerSpec;
}

describe("la fiche de l'explainer", () => {
  it("accepte la fiche d'exemple, dans les deux langues, sans scène trop courte", () => {
    expect(erreursDeLExplainer(copie())).toEqual([]);
    expect(scenesTropCourtes(copie(), "fr")).toEqual([]);
    expect(scenesTropCourtes(copie(), "en")).toEqual([]);
  });

  it("garde les listes du validateur identiques à celles de spec.ts", () => {
    expect(PICTOS_CONNUS).toEqual([...PICTOS]);
    expect(TYPES_CONNUS).toEqual([...TYPES_DE_VISUEL]);
  });

  it("exige des mots du même type que le visuel de la scène", () => {
    const spec = copie();
    spec.textes.en.scenes["piege"]!.mots = { type: "chiffre", valeur: "1" };
    expect(erreursDeLExplainer(spec)).toContain("textes.en.scenes.piege.mots.type : « tampon » attendu, comme le visuel de la scène");
  });

  it("signale une scène sans textes, et des textes sans scène", () => {
    const spec = copie();
    delete spec.textes.fr.scenes["parade"];
    spec.textes.fr.scenes["orpheline"] = spec.textes.fr.scenes["lecon"]!;
    const erreurs = erreursDeLExplainer(spec);
    expect(erreurs).toContain("textes.fr.scenes.parade : manquant");
    expect(erreurs).toContain("textes.fr.scenes.orpheline : aucune scène ne porte cet identifiant");
  });

  it("refuse un pictogramme inconnu (aucun logo de marque tierce)", () => {
    const spec = copie();
    spec.scenes[0]!.visuel = { type: "chiffre", picto: "huggingface" as never };
    expect(erreursDeLExplainer(spec).some((e) => e.startsWith("scenes[0].visuel.picto"))).toBe(true);
  });

  it("exige que le mot fort figure dans la phrase, et une phrase pour finir", () => {
    const spec = copie();
    spec.textes.fr.scenes["lecon"]!.mots = { type: "phrase", phrase: "Une phrase.", motFort: "absent" };
    expect(erreursDeLExplainer(spec)).toContain("textes.fr.scenes.lecon.mots.motFort : doit figurer tel quel dans la phrase");
    const sansFin = copie();
    sansFin.scenes.pop();
    expect(erreursDeLExplainer(sansFin)).toContain("scenes : la dernière scène est une `phrase`, la conclusion qu'on retient");
  });

  it("borne la liste à 2 à 4 lignes, et réserve l'identifiant « fin »", () => {
    const spec = copie();
    spec.textes.en.scenes["parade"]!.mots = { type: "liste", elements: ["une seule"] };
    spec.scenes[0]!.id = "fin";
    const erreurs = erreursDeLExplainer(spec);
    expect(erreurs).toContain("textes.en.scenes.parade.mots.elements : 2 à 4 lignes");
    expect(erreurs).toContain("scenes[0].id : « fin » est réservé à la fin de la vidéo");
  });

  it("reprend les règles du film pour la marque et la musique", () => {
    const spec = copie() as unknown as Record<string, unknown>;
    (spec.musique as Record<string, unknown>).tempo = -1;
    expect(erreursDeLExplainer(spec).some((e) => e.startsWith("musique.tempo"))).toBe(true);
  });
});

describe("le rythme", () => {
  it("compte le temps d'une liste par ligne", () => {
    expect(dernierTemps({ type: "liste", elements: ["a", "b", "c", "d"] }, false)).toBe(0.5 + 1 + 3 * 2);
  });

  it("refuse une scène trop courte pour ce qu'elle montre", () => {
    const spec = copie();
    spec.scenes.find((s) => s.id === "parade")!.mesures = 1;
    expect(scenesTropCourtes(spec, "fr")).toEqual(["parade"]);
  });

  it("ajoute la fin après la dernière scène", () => {
    expect(plansDeLExplainer(copie()).map((p) => p.id)).toEqual(["constat", "deux-pages", "piege", "parade", "lecon", "fin"]);
  });
});
