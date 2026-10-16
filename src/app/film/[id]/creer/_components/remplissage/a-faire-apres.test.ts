import { describe, expect, it } from "vitest";

import type { ResumeDuRemplissage } from "../use-remplissage";
import { aFaireApres, aSavoir } from "./a-faire-apres";

const COMPLET: ResumeDuRemplissage = {
  captures: 18, capturesGardees: 0, videos: 5, moments: 3, logo: true, redaction: "textes proposés par Claude",
  serie: "un premier épisode proposé (6 plans), à relire dans « Ta série »", textesProposes: 55,
  aEcrire: ["fr.conversation", "en.conversation", "fr.momentCle"], suggestionsEnAttente: 0,
  marque: ["fond clair : aucun lu, blanc par défaut"],
};

describe("aFaireApres", () => {
  it("chaque chose à faire mène au bon onglet, la plus urgente d'abord", () => {
    const liste = aFaireApres(COMPLET);
    expect(liste.map((a) => a.destination)).toEqual(["histoire", "histoire", "serie", "marque", "ecrans"]);
    expect(liste[0]!.texte).toBe("Écrire toi-même la conversation, le moment clé");
    expect(liste[1]!.texte).toContain("55 textes proposés");
  });

  it("un logo introuvable passe avant la relecture", () => {
    const liste = aFaireApres({ ...COMPLET, aEcrire: [], logo: false });
    expect(liste[0]).toMatchObject({ destination: "marque", bouton: "Déposer" });
  });

  it("rien de proposé : rien à relire, seulement ce qui manque", () => {
    const liste = aFaireApres({ ...COMPLET, captures: 0, videos: 0, textesProposes: 0, serie: undefined, marque: [], aEcrire: [] });
    expect(liste).toEqual([]);
  });

  it("singulier et pluriel justes", () => {
    const liste = aFaireApres({ ...COMPLET, textesProposes: 1, suggestionsEnAttente: 1 });
    expect(liste.map((a) => a.texte)).toEqual(expect.arrayContaining([
      "Relire 1 texte proposé, marqué « Proposé, à vérifier »",
      "Comparer 1 proposition avec ce que tu avais déjà écrit",
    ]));
  });
});

describe("aSavoir", () => {
  it("dit pourquoi rien n'a été rédigé et pourquoi la série n'a pas d'épisode", () => {
    const notes = aSavoir({ ...COMPLET, textesProposes: 0, redaction: "sans clé Claude : les textes restent à écrire", serie: "sans clé Claude : pas d'épisode proposé", marque: [] });
    expect(notes).toEqual(["Textes : sans clé Claude : les textes restent à écrire.", "Série : sans clé Claude : pas d'épisode proposé."]);
  });

  it("les couleurs par défaut sont dites, avec une majuscule", () => {
    expect(aSavoir(COMPLET)).toEqual(["Fond clair : aucun lu, blanc par défaut."]);
  });

  it("les captures gardées ne sont dites qu'à côté de nouvelles captures", () => {
    expect(aSavoir({ ...COMPLET, marque: [], captures: 4, capturesGardees: 2 })).toEqual(["2 captures déjà là, gardées telles quelles."]);
    expect(aSavoir({ ...COMPLET, marque: [], captures: 0, capturesGardees: 18 })).toEqual([]);
  });
});
