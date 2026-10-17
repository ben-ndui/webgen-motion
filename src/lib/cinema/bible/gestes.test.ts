import { describe, expect, it } from "vitest";

import type { FicheVisuelle, VersionDUneVue } from "./etat";
import { LONGUEUR_MAX_DU_MOTIF, ajouterUneVersion, choisirLaPrincipale, deverrouillerLaReference, prochaineVersion, revenirAUneVersion, validerLaReference } from "./gestes";

const version = (n: number, fichier = `cinema/bible/awa/face-v${n}.jpg`): VersionDUneVue => ({ n, fichier, origine: "generee", creeeLe: "2026-10-17" });
const ficheVide = (): FicheVisuelle => ({ statut: "propose", vues: {}, journal: [] });

describe("ajouterUneVersion", () => {
  it("la première version d'une vue devient la retenue", () => {
    const fiche = ficheVide();
    expect(ajouterUneVersion(fiche, "face", version(1))).toBeNull();
    expect(fiche.vues.face).toEqual({ versions: [version(1)], retenue: 1 });
  });

  it("une nouvelle version s'ajoute sans écraser les précédentes, et devient la retenue", () => {
    const fiche = ficheVide();
    ajouterUneVersion(fiche, "face", version(1));
    ajouterUneVersion(fiche, "face", version(2));
    expect(fiche.vues.face?.versions).toHaveLength(2);
    expect(fiche.vues.face?.retenue).toBe(2);
  });

  it("refuse une référence déjà validée : verrouillée", () => {
    const fiche: FicheVisuelle = { statut: "valide", vues: {}, journal: [] };
    expect(ajouterUneVersion(fiche, "face", version(1))).toMatch(/verrouillée/);
    expect(fiche.vues.face).toBeUndefined();
  });

  it("refuse de dupliquer un numéro de version existant", () => {
    const fiche = ficheVide();
    ajouterUneVersion(fiche, "face", version(1));
    expect(ajouterUneVersion(fiche, "face", version(1))).toMatch(/existe déjà/);
  });
});

describe("prochaineVersion", () => {
  it("1 pour une vue absente, puis le numéro suivant", () => {
    const fiche = ficheVide();
    expect(prochaineVersion(fiche, "face")).toBe(1);
    ajouterUneVersion(fiche, "face", version(1));
    expect(prochaineVersion(fiche, "face")).toBe(2);
  });
});

describe("revenirAUneVersion", () => {
  it("fait revenir la vue sur une ancienne version", () => {
    const fiche = ficheVide();
    ajouterUneVersion(fiche, "face", version(1));
    ajouterUneVersion(fiche, "face", version(2));
    expect(revenirAUneVersion(fiche, "face", 1)).toBeNull();
    expect(fiche.vues.face?.retenue).toBe(1);
  });

  it("refuse un numéro qui n'existe pas", () => {
    const fiche = ficheVide();
    ajouterUneVersion(fiche, "face", version(1));
    expect(revenirAUneVersion(fiche, "face", 9)).toMatch(/n'existe pas/);
  });
});

describe("choisirLaPrincipale", () => {
  it("refuse une vue sans image", () => {
    const fiche = ficheVide();
    expect(choisirLaPrincipale(fiche, "personnage", "face")).toMatch(/n'a pas encore d'image/);
  });

  it("refuse une vue qui n'existe pas pour ce type (un objet n'a qu'une « image »)", () => {
    const fiche = ficheVide();
    expect(choisirLaPrincipale(fiche, "objet", "face")).toMatch(/n'existe pas pour ce type/);
  });

  it("accepte une vue qui a une image", () => {
    const fiche = ficheVide();
    ajouterUneVersion(fiche, "en-pied", version(1, "cinema/bible/awa/en-pied-v1.jpg"));
    expect(choisirLaPrincipale(fiche, "personnage", "en-pied")).toBeNull();
    expect(fiche.principale).toBe("en-pied");
  });
});

describe("validerLaReference / deverrouillerLaReference", () => {
  it("refuse de valider une référence sans aucune image", () => {
    const fiche = ficheVide();
    expect(validerLaReference(fiche, "personnage", "2026-10-17")).toMatch(/Rien à valider/);
    expect(fiche.statut).toBe("propose");
  });

  it("valide fige le statut et journalise", () => {
    const fiche = ficheVide();
    ajouterUneVersion(fiche, "face", version(1));
    expect(validerLaReference(fiche, "personnage", "2026-10-17")).toBeNull();
    expect(fiche.statut).toBe("valide");
    expect(fiche.journal).toEqual([{ action: "validation", le: "2026-10-17" }]);
  });

  it("déverrouiller exige un motif, le journalise et rend la référence modifiable", () => {
    const fiche = ficheVide();
    ajouterUneVersion(fiche, "face", version(1));
    validerLaReference(fiche, "personnage", "2026-10-17");
    expect(deverrouillerLaReference(fiche, "  ", "2026-10-18")).toMatch(/Dis pourquoi/);
    expect(deverrouillerLaReference(fiche, "x".repeat(LONGUEUR_MAX_DU_MOTIF + 1), "2026-10-18")).toMatch(new RegExp(`${LONGUEUR_MAX_DU_MOTIF} caractères`));
    expect(deverrouillerLaReference(fiche, "le visage a changé", "2026-10-18")).toBeNull();
    expect(fiche.statut).toBe("propose");
    expect(fiche.journal.at(-1)).toEqual({ action: "deverrouillage", le: "2026-10-18", motif: "le visage a changé" });
    // Reverrouillable : ajouterUneVersion refusait pendant qu'elle était validée, elle l'accepte de nouveau.
    expect(ajouterUneVersion(fiche, "face", version(2))).toBeNull();
  });

  it("déverrouiller une référence déjà proposée ne fait rien", () => {
    const fiche = ficheVide();
    expect(deverrouillerLaReference(fiche, "motif", "2026-10-18")).toBeNull();
    expect(fiche.journal).toEqual([]);
  });
});
