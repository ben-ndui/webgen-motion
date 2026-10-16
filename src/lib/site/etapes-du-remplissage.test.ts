import { describe, expect, it } from "vitest";

import { AVANCEMENT_DE_DEPART, avancer, etatsDesEtapes } from "./etapes-du-remplissage";

describe("avancer", () => {
  it("passe à l'étape annoncée et garde son détail", () => {
    const suite = avancer(AVANCEMENT_DE_DEPART, { type: "phase", etape: "captures", label: "Capture de la page 3 du parcours…" });
    expect(suite).toEqual({ etape: "captures", detail: "Capture de la page 3 du parcours…", apercus: [] });
  });

  it("ne recule jamais : un message tardif d'une étape passée ne change que le détail", () => {
    const enVideos = avancer(AVANCEMENT_DE_DEPART, { type: "phase", etape: "videos", label: "On filme l'étape 1…" });
    const tardif = avancer(enVideos, { type: "phase", etape: "captures", label: "Page ignorée (ne s'ouvre pas)" });
    expect(tardif.etape).toBe("videos");
    expect(tardif.detail).toBe("Page ignorée (ne s'ouvre pas)");
  });

  it("un message sans étape (ancien script) reste dans l'étape en cours", () => {
    const suite = avancer({ ...AVANCEMENT_DE_DEPART, etape: "marque" }, { type: "phase", label: "Quelque chose…" });
    expect(suite.etape).toBe("marque");
    expect(suite.detail).toBe("Quelque chose…");
  });

  it("ajoute chaque aperçu une seule fois, dans l'ordre d'arrivée", () => {
    let a = avancer(AVANCEMENT_DE_DEPART, { type: "apercu", numero: 2 });
    a = avancer(a, { type: "apercu", numero: 1 });
    a = avancer(a, { type: "apercu", numero: 2 });
    expect(a.apercus).toEqual([2, 1]);
  });

  it("ignore ce qu'il ne comprend pas", () => {
    expect(avancer(AVANCEMENT_DE_DEPART, { type: "done" })).toBe(AVANCEMENT_DE_DEPART);
    expect(avancer(AVANCEMENT_DE_DEPART, { type: "apercu", numero: "3" })).toBe(AVANCEMENT_DE_DEPART);
  });
});

describe("etatsDesEtapes", () => {
  it("coche ce qui précède, anime l'étape en cours, laisse la suite à venir", () => {
    expect(etatsDesEtapes("captures", "en-cours")).toEqual(["faite", "faite", "en-cours", "a-venir", "a-venir"]);
  });
  it("tout est coché quand c'est fini, même une étape sautée", () => {
    expect(etatsDesEtapes("marque", "fini")).toEqual(["faite", "faite", "faite", "faite", "faite"]);
  });
  it("marque l'étape où ça a échoué", () => {
    expect(etatsDesEtapes("videos", "echec")).toEqual(["faite", "faite", "faite", "echouee", "a-venir"]);
  });
});
