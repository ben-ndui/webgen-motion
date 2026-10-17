import { describe, expect, it } from "vitest";

import type { CinemaDuFilm } from "../../../../remotion/film/cinema/types";
import {
  type FicheVisuelle,
  bibleVide,
  ficheVisuelleDe,
  imagePrincipale,
  imageValideePourVeo,
  referencesDeLaSerie,
  trouverLaReference,
  versionRetenue,
  vuePrincipale,
} from "./etat";

const cinema: CinemaDuFilm = {
  personnages: [{ id: "awa", nom: "Awa", description: "x" }, { id: "ancien", nom: "Léa", description: "x", portrait: "cinema/personnages/ancien.jpg" }],
  elements: [{ id: "dragon", type: "creature", nom: "Dragon ancien", description: "x" }],
  episodes: [],
};

function ficheAvecUneFaceProposee(): FicheVisuelle {
  const fiche: FicheVisuelle = { statut: "propose", vues: {}, journal: [] };
  fiche.vues.face = { versions: [{ n: 1, fichier: "cinema/bible/awa/face-v1.jpg", origine: "generee", creeeLe: "2026-10-17" }], retenue: 1 };
  return fiche;
}

describe("referencesDeLaSerie / trouverLaReference", () => {
  it("liste les personnages puis les éléments", () => {
    const references = referencesDeLaSerie(cinema);
    expect(references.map((r) => r.id)).toEqual(["awa", "ancien", "dragon"]);
    expect(references.find((r) => r.id === "dragon")?.type).toBe("creature");
  });

  it("une référence inconnue ne se trouve pas", () => {
    expect(trouverLaReference(cinema, "inconnue")).toBeUndefined();
  });
});

describe("ficheVisuelleDe — migration de l'ancien portrait", () => {
  it("un personnage sans fiche en bible.json et sans ancien portrait part d'une bible vide", () => {
    const fiche = ficheVisuelleDe(bibleVide(), trouverLaReference(cinema, "awa")!);
    expect(fiche).toEqual({ statut: "propose", vues: {}, journal: [] });
  });

  it("l'ancien portrait devient la version 1 de la vue « en pied », proposée", () => {
    const fiche = ficheVisuelleDe(bibleVide(), trouverLaReference(cinema, "ancien")!);
    expect(fiche.statut).toBe("propose");
    expect(fiche.vues["en-pied"]).toEqual({ versions: [{ n: 1, fichier: "cinema/personnages/ancien.jpg", origine: "generee", creeeLe: null }], retenue: 1 });
  });

  it("une référence déjà connue de bible.json n'est jamais migrée par-dessus", () => {
    const bible = bibleVide();
    bible.references.ancien = { statut: "valide", vues: {}, journal: [] };
    expect(ficheVisuelleDe(bible, trouverLaReference(cinema, "ancien")!)).toBe(bible.references.ancien);
  });
});

describe("vuePrincipale / imagePrincipale", () => {
  it("rend l'image même si la référence n'est pas encore validée", () => {
    const fiche = ficheAvecUneFaceProposee();
    expect(vuePrincipale(fiche, "personnage")).toBe("face");
    expect(imagePrincipale(fiche, "personnage")?.fichier).toBe("cinema/bible/awa/face-v1.jpg");
  });

  it("sans aucune vue ayant une image : rien", () => {
    expect(imagePrincipale({ statut: "propose", vues: {}, journal: [] }, "personnage")).toBeNull();
  });

  it("une vue choisie explicitement prime, si elle a une image", () => {
    const fiche = ficheAvecUneFaceProposee();
    fiche.vues["en-pied"] = { versions: [{ n: 1, fichier: "cinema/bible/awa/en-pied-v1.jpg", origine: "generee", creeeLe: "2026-10-17" }], retenue: 1 };
    fiche.principale = "en-pied";
    expect(vuePrincipale(fiche, "personnage")).toBe("en-pied");
  });
});

describe("imageValideePourVeo — ne part en génération qu'une fois le canon verrouillé", () => {
  it("une référence proposée (pas encore validée) ne rend rien, même avec une image choisie", () => {
    expect(imageValideePourVeo(ficheAvecUneFaceProposee(), "personnage")).toBeNull();
  });

  it("une référence validée rend son image principale", () => {
    const fiche = ficheAvecUneFaceProposee();
    fiche.statut = "valide";
    expect(imageValideePourVeo(fiche, "personnage")?.fichier).toBe("cinema/bible/awa/face-v1.jpg");
  });

  it("validée mais sans aucune version retenue dans la vue : rien à envoyer", () => {
    const fiche: FicheVisuelle = { statut: "valide", vues: {}, journal: [] };
    expect(imageValideePourVeo(fiche, "personnage")).toBeNull();
  });
});

describe("versionRetenue", () => {
  it("rend null pour une vue absente", () => {
    expect(versionRetenue({ statut: "propose", vues: {}, journal: [] }, "face")).toBeNull();
  });
});
