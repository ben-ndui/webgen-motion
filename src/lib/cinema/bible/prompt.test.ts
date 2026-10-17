import { describe, expect, it } from "vitest";

import type { VueDeReference } from "./etat";
import { promptDeLaVue } from "./prompt";

const personnage = { type: "personnage" as const, description: "A woman in her thirties, short natural hair." };
const creature = { type: "creature" as const, description: "A black wolf with silver markings, violet eyes." };
const objet = { type: "objet" as const, description: "A golden crown with emerald leaves." };
const decor = { type: "decor" as const, description: "A moonlit forest clearing." };

describe("promptDeLaVue", () => {
  it.each<[VueDeReference, string]>([
    ["face", "facing directly towards the camera"],
    ["trois-quarts", "three-quarter angle view"],
    ["profil", "exact side profile view"],
    ["en-pied", "full-body character reference, standing"],
  ])("cadre un personnage en %s", (vue, attendu) => {
    expect(promptDeLaVue(personnage, vue)).toContain(attendu);
  });

  it("répète la description mot pour mot pour garder le même visage d'une vue à l'autre", () => {
    expect(promptDeLaVue(personnage, "face")).toContain(personnage.description);
  });

  it("une créature suit le même cadrage qu'un personnage", () => {
    expect(promptDeLaVue(creature, "profil")).toContain("exact side profile view");
  });

  it("un objet ou un décor n'a qu'une vue, sans cadrage de personnage", () => {
    expect(promptDeLaVue(objet, "image")).not.toContain("character reference, head");
    expect(promptDeLaVue(objet, "image")).toContain(objet.description);
    expect(promptDeLaVue(decor, "image")).toContain(decor.description);
  });

  it("toujours un fond neutre et aucun texte/logo, pour ne pas polluer la référence", () => {
    for (const prompt of [promptDeLaVue(personnage, "face"), promptDeLaVue(objet, "image")]) {
      expect(prompt).toContain("plain light grey seamless studio background");
      expect(prompt).toContain("No props, no text, no logo.");
    }
  });
});
