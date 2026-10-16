import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { deposerMusiqueDuFormat } from "./format-depot";
import { resumerProjet } from "./format-etat";
import { chargerProjet, creerProjet, lireProjetBrut, projetDeDepart } from "./format-loader";

const jetable = () => mkdtempSync(join(tmpdir(), "formats-etat-"));

function lieux() {
  const racine = jetable();
  return { fiches: join(racine, "fiches"), public: (id: string) => join(racine, "medias", id, "public"), sortie: (id: string) => join(racine, "medias", id, "out") };
}

function metronome(secondes: number): Uint8Array {
  const chemin = join(jetable(), "clic.wav");
  spawnSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", `aevalsrc=if(lt(mod(t\\,0.5)\\,0.02)\\,0.9\\,0):s=8000:d=${secondes}`, chemin]);
  return readFileSync(chemin);
}

function resume(id: string, l: ReturnType<typeof lieux>) {
  return resumerProjet(chargerProjet(id, l.fiches)!, { public: l.public, sortie: l.sortie });
}

describe("l'état d'un projet de format", () => {
  it("dit « exemple » tant que le contenu d'exemple n'est pas remplacé", () => {
    const l = lieux();
    creerProjet("essai", projetDeDepart("conte", "essai"), l.fiches);
    expect(resume("essai", l)).toMatchObject({ statut: "exemple", libelle: "Conte à compteur" });
  });

  it("liste chaque fichier attendu, présent ou non, puis passe à « prêt » et à « rendu »", () => {
    const l = lieux();
    const fiche = projetDeDepart("explainer", "essai");
    fiche.spec.exemple = false;
    creerProjet("essai", fiche, l.fiches);
    expect(resume("essai", l)).toMatchObject({ statut: "medias-manquants", medias: [{ relatif: "musique/aurectheme-summer-house-583397.mp3", present: false }] });
    mkdirSync(join(l.public("essai"), "musique"), { recursive: true });
    writeFileSync(join(l.public("essai"), "musique/aurectheme-summer-house-583397.mp3"), "x");
    expect(resume("essai", l).statut).toBe("pret");
    mkdirSync(l.sortie("essai"), { recursive: true });
    writeFileSync(join(l.sortie("essai"), "Explainer-FR.mp4"), "video");
    const rendu = resume("essai", l);
    expect(rendu.statut).toBe("rendu");
    expect(rendu.declinaisons[0]!.rendu?.url).toMatch(/^\/api\/motion\/formats\/video\?id=essai&declinaison=Explainer-FR&t=\d+$/);
  });

  it("garde un projet invalide lisible, avec ses erreurs", () => {
    const l = lieux();
    mkdirSync(l.fiches, { recursive: true });
    writeFileSync(join(l.fiches, "casse.json"), JSON.stringify({ format: "conte", spec: {} }));
    const r = resume("casse", l);
    expect(r.statut).toBe("invalide");
    expect(r.erreurs.length).toBeGreaterThan(0);
  });
});

describe("déposer la musique d'un format", () => {
  it("range et mesure la musique de fond d'un conte", () => {
    const l = lieux();
    creerProjet("essai", projetDeDepart("conte", "essai"), l.fiches);
    expect(deposerMusiqueDuFormat("essai", "Mon Morceau.wav", metronome(25), l)).toEqual({ ok: true });
    const { spec } = lireProjetBrut("essai", l.fiches) as { spec: { musique: { fichier: string; tempo: number } } };
    expect(spec.musique.fichier).toBe("musique/mon-morceau.wav");
    expect(Math.abs(spec.musique.tempo - 120)).toBeLessThanOrEqual(0.2);
  });

  it("pour un karaoké, c'est LE morceau, et son passage reste dans sa durée", () => {
    const l = lieux();
    creerProjet("clip", projetDeDepart("karaoke", "clip"), l.fiches);
    expect(deposerMusiqueDuFormat("clip", "10 ANS.wav", metronome(25), l)).toEqual({ ok: true });
    const { spec } = lireProjetBrut("clip", l.fiches) as { spec: { morceau: { fichier: string; debut: number; fin: number; titre: string } } };
    expect(spec.morceau.fichier).toBe("musique/10-ans.wav");
    expect(spec.morceau.fin).toBeLessThanOrEqual(25.01);
    expect(spec.morceau.fin - spec.morceau.debut).toBeGreaterThanOrEqual(5);
    expect(spec.morceau.titre).toBe("10 ANS");
  });

  it("refuse ce qui n'est pas de l'audio, et un projet absent", () => {
    const l = lieux();
    creerProjet("essai", projetDeDepart("conte", "essai"), l.fiches);
    expect(deposerMusiqueDuFormat("essai", "photo.png", new Uint8Array(10), l)).toMatchObject({ ok: false, statut: 400 });
    expect(deposerMusiqueDuFormat("absent", "m.wav", metronome(25), l)).toMatchObject({ ok: false, statut: 404 });
  });
});
