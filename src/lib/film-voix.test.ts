import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import type { ResolvedVoiceBackend } from "./config";
import { creerFilm, lireFicheBrute } from "./film-ecriture";
import { ficheDeDepart } from "./film-fiche-depart";
import { dossierJetable } from "./film-fixtures.test-utils";
import { genererLesVoix } from "./film-voix";

const MOTEUR: ResolvedVoiceBackend = { kind: "google", voice: "fr-FR-Neural2-D", languageCode: "fr-FR", speakingRate: 1, pronunciation: {}, credentialsPath: "x" };

// Un fournisseur local : un vrai MP3 dont la durée suit la longueur du texte.
function fournisseurLocal(appels: string[]) {
  return async (texte: string, cache: string) => {
    appels.push(texte);
    const chemin = join(cache, `${texte.length}-${appels.length}.mp3`);
    spawnSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", `sine=d=${(texte.length / 15).toFixed(2)}`, chemin]);
    return { mp3Path: chemin };
  };
}

function filmAvecVoix() {
  const racine = dossierJetable("voix");
  const fiche = ficheDeDepart({ nom: "Saya", langues: ["fr"], formats: ["court"], direction: "nocturne" });
  fiche.voix = { musiqueSousLaVoix: 0.3, lignes: { fr: [{ repere: "bascule.constat", texte: "Les parfums naturels sont rares." }, { repere: "fin.disponible", texte: "Sur maisonsayasignature.com." }], en: [] } };
  const lieux = { fiches: join(racine, "fiches"), public: (id: string) => join(racine, "public", id), cache: join(racine, "cache"), moteur: () => MOTEUR };
  creerFilm("saya", fiche, lieux.fiches);
  return lieux;
}

describe("génération de la voix off d'un film", () => {
  it("génère chaque ligne, la copie dans le film, la mesure et la cite", async () => {
    const lieux = filmAvecVoix();
    const appels: string[] = [];
    const resultat = await genererLesVoix("saya", { ...lieux, synthetiser: fournisseurLocal(appels) });
    expect(resultat).toEqual({ ok: true, generees: 2, erreurs: [] });
    const fiche = lireFicheBrute("saya", lieux.fiches) as { voix: { lignes: { fr: { fichier: string; duree: number }[] } } };
    for (const ligne of fiche.voix.lignes.fr) {
      expect(ligne.fichier).toMatch(/^voix\/fr\//);
      expect(existsSync(join(lieux.public("saya"), ligne.fichier))).toBe(true);
      expect(ligne.duree).toBeGreaterThan(1);
    }
  });

  it("met chaque voix au volume des réseaux, quel que soit le volume d'origine", async () => {
    const lieux = filmAvecVoix();
    const discret = async (texte: string, cache: string) => {
      const chemin = join(cache, `discret-${texte.length}.mp3`);
      spawnSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "sine=f=220:d=3", "-af", "volume=0.05", chemin]);
      return { mp3Path: chemin };
    };
    await genererLesVoix("saya", { ...lieux, synthetiser: discret });
    const fiche = lireFicheBrute("saya", lieux.fiches) as { voix: { lignes: { fr: { fichier: string }[] } } };
    const mesure = spawnSync("ffmpeg", ["-i", join(lieux.public("saya"), fiche.voix.lignes.fr[0]!.fichier), "-af", "ebur128", "-f", "null", "-"], { encoding: "utf-8" });
    const lufs = Number(/I:\s+(-?[\d.]+) LUFS\s*$/m.exec(mesure.stderr.split("Summary")[1] ?? "")?.[1]);
    expect(Math.abs(lufs - -14)).toBeLessThan(2);
  });

  it("ne régénère pas une ligne déjà là", async () => {
    const lieux = filmAvecVoix();
    const appels: string[] = [];
    await genererLesVoix("saya", { ...lieux, synthetiser: fournisseurLocal(appels) });
    await genererLesVoix("saya", { ...lieux, synthetiser: fournisseurLocal(appels) });
    expect(appels).toHaveLength(2);
  });

  it("ignore une phrase écrite pour un plan absent du montage (jamais entendue)", async () => {
    const lieux = filmAvecVoix();
    const fiche = lireFicheBrute("saya", lieux.fiches) as { voix: { lignes: { fr: { repere: string; texte: string }[] } } };
    fiche.voix.lignes.fr.push({ repere: "marque.mots.0", texte: "Pas dans le format vertical." });
    const { enregistrerFilm } = await import("./film-ecriture");
    enregistrerFilm("saya", fiche, lieux.fiches);
    const appels: string[] = [];
    await genererLesVoix("saya", { ...lieux, synthetiser: fournisseurLocal(appels) });
    expect(appels).not.toContain("Pas dans le format vertical.");
  });

  it("sans voix réglée, le dit clairement au lieu d'échouer en silence", async () => {
    const lieux = filmAvecVoix();
    expect(await genererLesVoix("saya", { ...lieux, moteur: () => null })).toMatchObject({ ok: false, statut: 412 });
  });

  it("une ligne en échec n'empêche pas les autres, et l'échec est dit", async () => {
    const lieux = filmAvecVoix();
    const appels: string[] = [];
    const local = fournisseurLocal(appels);
    const capricieux = async (texte: string, cache: string) => {
      if (texte.startsWith("Sur")) throw new Error("quota dépassé");
      return local(texte, cache);
    };
    const resultat = await genererLesVoix("saya", { ...lieux, synthetiser: capricieux });
    expect(resultat).toEqual({ ok: true, generees: 1, erreurs: ["FR · fin.disponible : quota dépassé"] });
  });
});
