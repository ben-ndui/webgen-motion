import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { deposerMedias, dossierJetable, ecrireFiche, ficheValide } from "./film-fixtures.test-utils";
import { lireLigneDuRendu, lireRequeteDeRendu, preparerRendu } from "./film-rendu";

describe("lireRequeteDeRendu (entrées de la route)", () => {
  it("accepte deux noms sûrs", () => {
    expect(lireRequeteDeRendu({ filmId: "kotizo", declinaison: "Court-FR" })).toEqual({
      ok: true,
      requete: { filmId: "kotizo", declinaison: "Court-FR" },
    });
  });

  it.each([
    [null, /Corps JSON/],
    [[], /Corps JSON/],
    [{ declinaison: "Court-FR" }, /filmId/],
    [{ filmId: "../../etc", declinaison: "Court-FR" }, /filmId/],
    [{ filmId: "kotizo/x", declinaison: "Court-FR" }, /filmId/],
    [{ filmId: "kotizo", declinaison: "../Court-FR" }, /declinaison/],
    [{ filmId: "kotizo", declinaison: "Court FR" }, /declinaison/],
    [{ filmId: "kotizo", declinaison: 3 }, /declinaison/],
    [{ filmId: "kotizo", declinaison: "" }, /declinaison/],
  ])("refuse %j", (corps, message) => {
    const lecture = lireRequeteDeRendu(corps);
    expect(lecture.ok).toBe(false);
    if (!lecture.ok) expect(lecture.erreur).toMatch(message);
  });
});

describe("preparerRendu", () => {
  function scene() {
    const racine = dossierJetable("rendu");
    const fiches = join(racine, "films");
    const lieux = { public: join(racine, "public"), sortie: join(racine, "out") };
    mkdirSync(fiches);
    return { fiches, lieux };
  }

  it("fiche absente : 404", () => {
    const { fiches, lieux } = scene();
    expect(preparerRendu("absent", "Court-FR", { dossierDesFiches: fiches, dossiers: lieux })).toMatchObject({
      ok: false,
      statut: 404,
    });
  });

  it("déclinaison inconnue : 400, en nommant les connues", () => {
    const { fiches, lieux } = scene();
    ecrireFiche(fiches, "f", ficheValide());
    const refus = preparerRendu("f", "Story-FR", { dossierDesFiches: fiches, dossiers: lieux });
    expect(refus).toMatchObject({ ok: false, statut: 400 });
    if (!refus.ok) expect(refus.erreurs[0]).toMatch(/connues : Film-FR, Film-EN, Court-FR, Court-EN/);
  });

  it("médias manquants pour la langue rendue : 400 ; ceux d'une autre langue ne bloquent pas", () => {
    const { fiches, lieux } = scene();
    const spec = ficheValide();
    ecrireFiche(fiches, "f", spec);
    expect(preparerRendu("f", "Court-FR", { dossierDesFiches: fiches, dossiers: lieux }).ok).toBe(false);
    deposerMedias(lieux.public, spec, ["fr"]);
    const rendu = preparerRendu("f", "Court-FR", { dossierDesFiches: fiches, dossiers: lieux });
    expect(rendu.ok).toBe(true);
    if (rendu.ok) {
      expect(rendu.sortie).toBe(join(lieux.sortie, "Court-FR.mp4"));
      expect(rendu.partiel).toBe(join(lieux.sortie, ".Court-FR.en-cours.mp4"));
    }
    expect(preparerRendu("f", "Court-EN", { dossierDesFiches: fiches, dossiers: lieux }).ok).toBe(false);
  });

  it("refuse une fiche encore marquée exemple", () => {
    const { fiches, lieux } = scene();
    const spec = ficheValide();
    spec.exemple = true;
    ecrireFiche(fiches, "f", spec);
    deposerMedias(lieux.public, spec);
    const refus = preparerRendu("f", "Court-FR", { dossierDesFiches: fiches, dossiers: lieux });
    expect(refus).toMatchObject({ ok: false, statut: 400 });
    if (!refus.ok) expect(refus.erreurs[0]).toMatch(/exemple/);
  });
});

describe("lireLigneDuRendu", () => {
  it("traduit la progression de Remotion", () => {
    expect(lireLigneDuRendu("Rendered 12/1224, time remaining: 30s")).toEqual({
      type: "progress",
      frames: 12,
      total: 1224,
      label: "Rendu image par image · 12/1224",
    });
    expect(lireLigneDuRendu("Encoded 1224/1224")).toMatchObject({ type: "progress", frames: 1224 });
    expect(lireLigneDuRendu("Bundling 40%")).toMatchObject({ type: "phase" });
    expect(lireLigneDuRendu("▶ Film Court-FR (fr, court)")).toMatchObject({ type: "phase" });
    expect(lireLigneDuRendu("✓ Done → /x/Court-FR.mp4")).toEqual({ type: "phase", label: "Finalisation…" });
  });

  it("ignore le reste", () => {
    expect(lireLigneDuRendu("")).toBeNull();
    expect(lireLigneDuRendu("  Public dir : /x")).toBeNull();
  });
});
