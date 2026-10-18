import { describe, expect, it } from "vitest";

import { bibleVide } from "./etat";
import { RESERVATION_ABANDONNEE_MS, cleDeLaVue, confirmerUneImage, libererSansFrais, reserverUneImage } from "./reservation";

describe("cleDeLaVue", () => {
  it("combine la référence et la vue", () => {
    expect(cleDeLaVue("awa", "face")).toBe("awa/face");
  });
});

describe("reserverUneImage", () => {
  it("réserve quand rien n'est en cours et le budget n'est pas atteint", () => {
    const bible = bibleVide();
    expect(reserverUneImage(bible, "awa/face", 10)).toEqual({ ok: true });
    expect(bible.enCours["awa/face"]).toBeDefined();
  });

  it("refuse le double clic sur la même vue", () => {
    const bible = bibleVide();
    reserverUneImage(bible, "awa/face", 10);
    expect(reserverUneImage(bible, "awa/face", 10)).toEqual({ ok: false, raison: "en-cours" });
  });

  it("deux vues différentes ne se bloquent pas l'une l'autre", () => {
    const bible = bibleVide();
    reserverUneImage(bible, "awa/face", 10);
    expect(reserverUneImage(bible, "awa/profil", 10)).toEqual({ ok: true });
  });

  it("refuse au-delà du plafond d'images", () => {
    const bible = bibleVide();
    bible.imagesGenerees = 10;
    expect(reserverUneImage(bible, "awa/face", 10)).toEqual({ ok: false, raison: "budget", generees: 10 });
  });

  it("une réservation abandonnée (serveur tombé) se retente", () => {
    const bible = bibleVide();
    const debut = 1_000_000;
    reserverUneImage(bible, "awa/face", 10, debut);
    expect(reserverUneImage(bible, "awa/face", 10, debut + RESERVATION_ABANDONNEE_MS + 1)).toEqual({ ok: true });
  });
});

describe("confirmerUneImage / libererSansFrais", () => {
  it("confirmer compte l'image et libère la réservation", () => {
    const bible = bibleVide();
    reserverUneImage(bible, "awa/face", 10);
    confirmerUneImage(bible, "awa/face");
    expect(bible.imagesGenerees).toBe(1);
    expect(bible.enCours["awa/face"]).toBeUndefined();
  });

  it("libérer sans frais ne compte rien, juste la réservation qui tombe", () => {
    const bible = bibleVide();
    reserverUneImage(bible, "awa/face", 10);
    libererSansFrais(bible, "awa/face");
    expect(bible.imagesGenerees).toBe(0);
    expect(bible.enCours["awa/face"]).toBeUndefined();
  });
});
