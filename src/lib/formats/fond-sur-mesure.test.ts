import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { KaraokeSpec } from "../../../remotion/film/karaoke/spec";
import { lireLeRegistre } from "../cinema/registre";
import { type GoogleLocal, demarrerGoogleLocal, enCours, lancementAccepte, termine } from "../cinema/veo-local.test-utils";
import { creerProjet, enregistrerProjet, lireProjetBrut, projetDeDepart } from "./format-loader";
import { type Lieux, lancerLeFond, suivreLeFond } from "./fond-sur-mesure";

let google: GoogleLocal;
let lieux: Lieux;

function projet(description = "Une rue de Bangui sous la pluie, néons orange") {
  const fiche = projetDeDepart("karaoke", "clip") as { format: "karaoke"; spec: KaraokeSpec };
  fiche.spec.decor = "sur-mesure";
  fiche.spec.fond = { description, videos: {} };
  creerProjet("clip", fiche, lieux.fiches);
}
const lancements = () => google.appels.filter((a) => a.methode === "POST");
const spec = () => (lireProjetBrut("clip", lieux.fiches) as { spec: KaraokeSpec }).spec;

beforeEach(async () => {
  google = await demarrerGoogleLocal();
  const racine = mkdtempSync(join(tmpdir(), "fond-"));
  lieux = { fiches: join(racine, "fiches"), dossier: () => join(racine, "projet"), public: () => join(racine, "projet", "public"), veo: () => ({ base: google.base, cle: "cle-de-test" }) };
});
afterEach(() => google.fermer());

describe("le décor sur mesure d'un karaoké", () => {
  it("le parcours complet : Veo Lite en 16:9, prompt dans la palette, vidéo rangée et citée, décor compté", async () => {
    projet();
    google.repondre(lancementAccepte(), enCours(), termine(google.base), { statut: 200, video: true });
    expect(await lancerLeFond("clip", "long", lieux)).toEqual({ ok: true, coutUsd: 0.64 });
    const corps = JSON.parse(lancements()[0]!.corps);
    expect(lancements()[0]!.chemin).toContain("veo-3.1-lite-generate-preview");
    expect(corps.parameters).toMatchObject({ aspectRatio: "16:9", durationSeconds: 8 });
    expect(corps.instances[0].prompt).toMatch(/Scene: Une rue de Bangui sous la pluie, néons orange/);
    expect(corps.instances[0].prompt).toMatch(/Color palette: [\s\S]+Avoid: text, letters/);
    expect(await suivreLeFond("clip", "long", lieux)).toEqual({ etat: "en-cours" });
    const pret = await suivreLeFond("clip", "long", lieux);
    expect(pret).toMatchObject({ etat: "pret" });
    const video = spec().fond?.videos.long;
    expect(video).toMatch(/^fond\/long-\d+\.mp4$/);
    expect(existsSync(join(lieux.public("clip"), video!))).toBe(true);
    expect(lireLeRegistre(lieux.dossier("clip")).utilises).toBe(1);
  });

  it("deux clics ne paient pas deux fois", async () => {
    projet();
    google.repondre(lancementAccepte());
    expect(await lancerLeFond("clip", "court", lieux)).toMatchObject({ ok: true });
    expect(await lancerLeFond("clip", "court", lieux)).toEqual({ ok: false, statut: 409, raison: "Ce décor est déjà en cours de génération." });
    expect(lancements()).toHaveLength(1);
  });

  it("un lancement refusé par Google n'est ni payé ni compté", async () => {
    projet();
    google.repondre({ statut: 429, corps: { error: { message: "Quota exceeded" } } });
    const refus = await lancerLeFond("clip", "long", lieux);
    expect(refus).toMatchObject({ ok: false, statut: 502 });
    if (!refus.ok) expect(refus.raison).toMatch(/Rien n'a été facturé/);
    expect(lireLeRegistre(lieux.dossier("clip")).utilises).toBe(0);
  });

  it("demande une description, puis une clé, avant d'appeler Google", async () => {
    projet("   ");
    expect(await lancerLeFond("clip", "long", lieux)).toEqual({ ok: false, statut: 409, raison: "Le projet a des erreurs : fond.description : texte non vide attendu" });
    const fiche = lireProjetBrut("clip", lieux.fiches) as { spec: KaraokeSpec };
    fiche.spec.fond = { description: "Une plage la nuit", videos: {} };
    enregistrerProjet("clip", fiche, lieux.fiches);
    expect(await lancerLeFond("clip", "long", { ...lieux, veo: () => null })).toMatchObject({ ok: false, statut: 412 });
    expect(lancements()).toHaveLength(0);
  });

  it("l'éditeur ne peut ni effacer ni forger la vidéo payée (champ du serveur)", async () => {
    projet();
    google.repondre(lancementAccepte(), termine(google.base), { statut: 200, video: true });
    await lancerLeFond("clip", "long", lieux);
    await suivreLeFond("clip", "long", lieux);
    const payee = spec().fond?.videos.long;
    const depuisLEditeur = lireProjetBrut("clip", lieux.fiches) as { spec: KaraokeSpec };
    depuisLEditeur.spec.fond = { description: "Autre", videos: { long: "../../ailleurs.mp4", court: "fond/forge.mp4" } };
    enregistrerProjet("clip", depuisLEditeur, lieux.fiches);
    expect(spec().fond).toEqual({ description: "Autre", videos: { long: payee } });
  });
});
