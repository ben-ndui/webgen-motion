import { describe, expect, it } from "vitest";

import type { ResolvedAgent } from "../config-resolve";
import type { ExplainerSpec } from "../../../remotion/film/explainer/spec";
import { nombresDe, nombresInventes } from "./demande-explainer";
import { ecrireLExplainer } from "./ecrire-l-explainer";
import { explainerDepuisClaude } from "./explainer-depuis-claude";
import { projetDeDepart } from "./format-loader";

const spec = () => (projetDeDepart("explainer", "essai") as { spec: ExplainerSpec }).spec;
const agent = { provider: "anthropic", apiKey: "cle-de-test", model: "claude-haiku-4-5" } as ResolvedAgent;
const NOTES = "Le 16 octobre, 1 dossier prêt sur 4 visait un poste déjà fermé chez l'employeur.";

/** Ce que Claude remplirait dans l'outil : quatre scènes, la dernière une phrase. */
function entree() {
  const texte = (l: string) => ({ chapitre: `Constaté ${l}`, sousTitre: `Un dossier sur quatre ${l}` });
  return {
    scenes: [
      { visuel: "chiffre", picto: "document", fr: { ...texte("fr"), valeur: "1 sur 4" }, en: { ...texte("en"), valeur: "1 in 4" } },
      { visuel: "opposition", pictoGauche: "ecran", pictoDroite: "formulaire",
        fr: { ...texte("fr"), gauche: { titre: "L'annonce", detail: "en ligne" }, droite: { titre: "Le poste", detail: "fermé" } },
        en: { ...texte("en"), gauche: { titre: "The ad", detail: "online" }, droite: { titre: "The role", detail: "closed" } } },
      { visuel: "liste", fr: { ...texte("fr"), lignes: ["Demander à l'employeur", "Revérifier"] }, en: { ...texte("en"), lignes: ["Ask the employer", "Check again"] } },
      { visuel: "phrase", picto: "loupe", fr: { chapitre: "À retenir", phrase: "Une annonce n'est pas un poste.", motFort: "pas un poste" },
        en: { chapitre: "Takeaway", phrase: "An ad is not a role.", motFort: "not a role" } },
    ],
    signatureFr: "Des outils qui disent vrai.",
    signatureEn: "Tools that tell the truth.",
  };
}
const claudeRemplit = (retouche: (e: ReturnType<typeof entree>) => void = () => {}) => async () => {
  const e = entree();
  retouche(e);
  return { ok: true as const, entree: e };
};

describe("les nombres écrits par Claude", () => {
  it("se comparent sans espace ni virgule de différence", () => {
    expect(nombresDe("70 000 messages, 3,5 % et 700 IA")).toEqual(["70000", "3.5", "700"]);
  });

  it("ne lit que les valeurs, jamais les clés", () => {
    expect(nombresInventes({ scenes: { "scene-2": { chapitre: "Le 16 octobre" } } }, NOTES)).toEqual([]);
    expect(nombresInventes({ scenes: { a: { mots: { valeur: "9 sur 10" } } } }, NOTES)).toEqual(["9", "10"]);
  });
});

describe("ce que Claude remplit, transformé en explainer", () => {
  it("le type des mots est celui du visuel, posé par le code", () => {
    const { scenes, textes } = explainerDepuisClaude(entree());
    expect(scenes.map((s) => s.visuel.type)).toEqual(["chiffre", "opposition", "liste", "phrase"]);
    expect(Object.values(textes.fr.scenes).map((t) => t.mots.type)).toEqual(["chiffre", "opposition", "liste", "phrase"]);
    expect(textes.fr.scenes["scene-4"]?.sousTitre).toBeUndefined();
  });
});

describe("faire écrire un explainer par Claude", () => {
  it("rend une proposition valide, fondée sur les notes", async () => {
    const reponse = await ecrireLExplainer(spec(), "Les offres fermées", NOTES, agent, claudeRemplit());
    expect(reponse).toMatchObject({ ok: true });
    if (reponse.ok) expect(reponse.proposition.scenes).toHaveLength(4);
  });

  it("refuse un chiffre absent des notes, et le nomme", async () => {
    const reponse = await ecrireLExplainer(spec(), "Les offres fermées", NOTES, agent, claudeRemplit((e) => { (e.scenes[0]!.fr as { valeur?: string }).valeur = "3 sur 4"; }));
    expect(reponse).toMatchObject({ ok: false, statut: 502 });
    if (!reponse.ok) expect(reponse.raison).toMatch(/3, absent de tes notes/);
  });

  it("un champ manquant est refusé avec son chemin, sans faire planter le serveur (vu le 17/10)", async () => {
    const reponse = await ecrireLExplainer(spec(), "Les offres fermées", NOTES, agent, claudeRemplit((e) => { delete (e.scenes[0]!.fr as { valeur?: string }).valeur; }));
    expect(reponse).toMatchObject({ ok: false, statut: 502 });
    if (!reponse.ok) expect(reponse.raison).toMatch(/textes\.fr\.scenes\.scene-1\.mots\.valeur/);
  });

  it("refuse une vidéo qui ne finit pas sur une phrase, et un appel sans proposition", async () => {
    expect(await ecrireLExplainer(spec(), "Les offres fermées", NOTES, agent, claudeRemplit((e) => { e.scenes.pop(); }))).toMatchObject({ ok: false, statut: 502 });
    const sansProposition = async () => ({ ok: false as const, raison: "Claude n'a pas rendu de proposition : relance." });
    expect(await ecrireLExplainer(spec(), "Les offres fermées", NOTES, agent, sansProposition)).toMatchObject({ ok: false, statut: 502 });
  });

  it("demande un sujet, des notes et une clé Claude avant d'appeler qui que ce soit", async () => {
    const jamais = async () => { throw new Error("Claude ne doit pas être appelé"); };
    expect(await ecrireLExplainer(spec(), "", NOTES, agent, jamais)).toMatchObject({ ok: false, statut: 400 });
    expect(await ecrireLExplainer(spec(), "Les offres", "court", agent, jamais)).toMatchObject({ ok: false, statut: 400 });
    expect(await ecrireLExplainer(spec(), "Les offres", NOTES, null, jamais)).toMatchObject({ ok: false, statut: 412 });
  });
});
