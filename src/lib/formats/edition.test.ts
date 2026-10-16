import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import type { ExplainerSpec } from "../../../remotion/film/explainer/spec";
import { erreursDeLExplainer } from "../../../remotion/film/explainer/validerExplainer";
import { changerLesDeclinaisons, nomDeDeclinaison } from "./declinaisons";
import { ajouterUneScene, changerLeVisuel, deplacerUneScene, retirerUneScene } from "./edition-explainer";
import { creerProjet, enregistrerProjet, lireProjetBrut, projetDeDepart } from "./format-loader";
import { textesAEcrire } from "./textes-a-ecrire";

const explainer = () => projetDeDepart("explainer", "essai") as { format: "explainer"; spec: ExplainerSpec };

describe("les textes encore à écrire", () => {
  it("un projet neuf est entièrement à écrire ; réécrit, il ne l'est plus", () => {
    const fiche = explainer();
    expect(textesAEcrire(fiche).length).toBeGreaterThan(10);
    for (const langue of ["fr", "en"] as const) {
      const textes = fiche.spec.textes[langue];
      textes.signature = `Signature ${langue}`;
      for (const [id, scene] of Object.entries(textes.scenes)) {
        scene.chapitre = `${id} ${langue}`;
        if (scene.sousTitre !== undefined) scene.sousTitre = `Sous-titre ${id} ${langue}`;
        if (scene.precision !== undefined) scene.precision = `Précision ${id} ${langue}`;
        scene.mots = JSON.parse(JSON.stringify(scene.mots).replace(/"(valeur|titre|detail|tampon|phrase|motFort)":"[^"]*"/g, `"$1":"${id} ${langue}"`));
        if (scene.mots.type === "liste") scene.mots.elements = scene.mots.elements.map((_, i) => `Ligne ${i} ${langue}`);
        if (scene.mots.type === "phrase") scene.mots.phrase = `Ma phrase ${scene.mots.motFort}`;
      }
    }
    // Reste la signature de l'exemple : son nom et son contact.
    expect(textesAEcrire(fiche).map((t) => t.chemin)).toEqual(["marque.nom", "marque.logo", "marque.contact"]);
    fiche.spec.marque.nom = "Ma marque";
    fiche.spec.marque.logo = { type: "motSymbole", texte: "ma marque", graisse: 600, approche: -0.03 };
    fiche.spec.marque.contact = "mamarque.fr";
    expect(textesAEcrire(fiche)).toEqual([]);
  });

  it("ne compte que les langues rendues", () => {
    const fiche = explainer();
    fiche.spec.declinaisons = fiche.spec.declinaisons.filter((d) => d.langue === "en");
    const textes = textesAEcrire(fiche).filter((t) => t.chemin.startsWith("textes."));
    expect(textes.length).toBeGreaterThan(0);
    expect(textes.every((t) => t.chemin.startsWith("textes.en"))).toBe(true);
  });

  it("le karaoké : le titre et l'artiste de l'exemple sont à remplacer", () => {
    const fiche = projetDeDepart("karaoke", "clip");
    expect(textesAEcrire(fiche).map((t) => t.chemin)).toEqual(expect.arrayContaining(["morceau.titre", "morceau.artiste"]));
  });

  it("le serveur décide `exemple`, quoi qu'envoie le navigateur", () => {
    const dossier = mkdtempSync(join(tmpdir(), "edition-"));
    creerProjet("essai", explainer(), dossier);
    const triche = explainer();
    triche.spec.exemple = false;
    enregistrerProjet("essai", triche, dossier);
    expect((lireProjetBrut("essai", dossier) as { spec: ExplainerSpec }).spec.exemple).toBe(true);
  });
});

describe("les déclinaisons d'un format", () => {
  it("se nomment d'après le format, et gardent les réglages de celles qui restent", () => {
    expect(nomDeDeclinaison("explainer", "fr", "court")).toBe("Explainer-Court-FR");
    const actuelles = [{ nom: "Explainer-FR", langue: "fr" as const, version: "long" as const, avecContact: false }];
    const nouvelles = changerLesDeclinaisons("explainer", actuelles, ["fr", "en"], ["long"]);
    expect(nouvelles).toEqual([actuelles[0], { nom: "Explainer-EN", langue: "en", version: "long", avecContact: true }]);
    expect(changerLesDeclinaisons("explainer", actuelles, [], ["long"])).toBe(actuelles);
  });
});

describe("modifier les scènes d'un explainer", () => {
  it("ajoute une scène dans les deux langues, avant la phrase finale", () => {
    const spec = ajouterUneScene(explainer().spec, 99, "tampon");
    const ids = spec.scenes.map((s) => s.id);
    expect(ids.at(-1)).toBe("lecon");
    const nouvelle = ids.at(-2)!;
    expect(spec.textes.fr.scenes[nouvelle]?.mots.type).toBe("tampon");
    expect(spec.textes.en.scenes[nouvelle]?.mots.type).toBe("tampon");
    // Vide = à écrire : la validation le dit champ par champ, sans rien casser d'autre.
    expect(erreursDeLExplainer(spec).every((e) => e.includes(nouvelle))).toBe(true);
  });

  it("change un visuel : nouveaux mots du bon type, plus de sous-titre pour une phrase", () => {
    const spec = changerLeVisuel(explainer().spec, "constat", "phrase");
    expect(spec.textes.fr.scenes.constat?.mots).toEqual({ type: "phrase", phrase: "", motFort: "" });
    expect(spec.textes.en.scenes.constat?.sousTitre).toBeUndefined();
  });

  it("retire et déplace sans désaccorder les langues, et garde deux scènes au moins", () => {
    let spec = retirerUneScene(explainer().spec, "piege");
    expect(spec.textes.fr.scenes.piege).toBeUndefined();
    expect(spec.textes.en.scenes.piege).toBeUndefined();
    spec = deplacerUneScene(spec, "parade", -1);
    expect(spec.scenes.map((s) => s.id)).toEqual(["constat", "parade", "deux-pages", "lecon"]);
    let deux = { ...spec, scenes: spec.scenes.slice(0, 2) };
    deux = retirerUneScene(deux, "constat");
    expect(deux.scenes).toHaveLength(2);
  });
});
