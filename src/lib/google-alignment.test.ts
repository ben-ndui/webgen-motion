import { describe, it, expect } from "vitest";
import { marksToCharAlignment, type WordMark } from "./google-alignment";

describe("marksToCharAlignment", () => {
  it("produit un tableau char-level de la longueur du texte", () => {
    const text = "Bonjour le monde";
    const marks: WordMark[] = [
      { word: "Bonjour", timeSec: 0 },
      { word: "le", timeSec: 0.8 },
      { word: "monde", timeSec: 1.0 },
    ];
    const a = marksToCharAlignment(text, marks, 1.6);
    expect(a.characters.length).toBe(text.length);
    expect(a.character_start_times_seconds.length).toBe(text.length);
    expect(a.character_end_times_seconds.length).toBe(text.length);
    expect(a.characters.join("")).toBe(text);
  });

  it("interpole les temps DANS un mot et respecte les bornes de mark", () => {
    const text = "ab cd"; // 2 mots de 2 chars
    const marks: WordMark[] = [
      { word: "ab", timeSec: 0 },
      { word: "cd", timeSec: 1 },
    ];
    const a = marksToCharAlignment(text, marks, 2);
    // "a" démarre à 0, "b" à mi-mot (0.5), fin du mot "ab" = début de "cd" = 1
    expect(a.character_start_times_seconds[0]).toBeCloseTo(0);
    expect(a.character_start_times_seconds[1]).toBeCloseTo(0.5);
    expect(a.character_end_times_seconds[1]).toBeCloseTo(1);
    // "c" démarre à 1, dernier mot borné par la durée totale (2)
    expect(a.character_start_times_seconds[3]).toBeCloseTo(1);
    expect(a.character_end_times_seconds[4]).toBeCloseTo(2);
  });

  it("les temps sont monotones croissants (jamais de retour arrière)", () => {
    const text = "Découvre UZME aujourd'hui vraiment";
    const marks: WordMark[] = [
      { word: "Découvre", timeSec: 0 },
      { word: "UZME", timeSec: 0.7 },
      { word: "aujourd'hui", timeSec: 1.1 },
      { word: "vraiment", timeSec: 1.9 },
    ];
    const a = marksToCharAlignment(text, marks, 2.5);
    for (let i = 1; i < a.character_start_times_seconds.length; i++) {
      expect(a.character_start_times_seconds[i]).toBeGreaterThanOrEqual(
        a.character_start_times_seconds[i - 1] - 1e-9,
      );
    }
    expect(a.character_end_times_seconds.at(-1)).toBeCloseTo(2.5);
  });

  it("l'espace entre 2 mots porte le temps de bord (fin mot i → début mot i+1)", () => {
    const text = "ab cd";
    const marks: WordMark[] = [
      { word: "ab", timeSec: 0 },
      { word: "cd", timeSec: 1 },
    ];
    const a = marksToCharAlignment(text, marks, 2);
    // l'espace (index 2) : de fin("ab")=1 à début("cd")=1
    expect(a.characters[2]).toBe(" ");
    expect(a.character_start_times_seconds[2]).toBeCloseTo(1);
    expect(a.character_end_times_seconds[2]).toBeCloseTo(1);
  });

  it("fallback si aucun mark : tout sur [0, durée]", () => {
    const a = marksToCharAlignment("abc", [], 3);
    expect(a.character_start_times_seconds).toEqual([0, 0, 0]);
    expect(a.character_end_times_seconds).toEqual([3, 3, 3]);
  });
});
