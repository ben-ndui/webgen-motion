import { describe, expect, it } from "vitest";

import { FILM } from "./film";
import type { FilmSpec } from "./spec";
import { erreursDeLaSpec, validerSpec } from "./validerSpec";

// Une copie modifiable de la fiche d'exemple, par un aller-retour JSON :
// c'est aussi le chemin qu'emprunte une fiche fournie par un outil.
function copie(): FilmSpec {
  return JSON.parse(JSON.stringify(FILM)) as FilmSpec;
}

describe("validerSpec", () => {
  it("accepte la fiche d'exemple, y compris après un passage en JSON", () => {
    expect(erreursDeLaSpec(FILM)).toEqual([]);
    expect(validerSpec(copie())).toEqual(FILM);
  });

  it("refuse ce qui n'est pas un objet", () => {
    expect(erreursDeLaSpec(null)).toEqual(["la fiche du film doit être un objet"]);
    expect(erreursDeLaSpec([])).toEqual(["la fiche du film doit être un objet"]);
  });

  it("liste TOUTES les erreurs, chacune avec le chemin du champ", () => {
    const spec = copie();
    spec.marque.couleurs.accent = "bleu";
    spec.textes.en.parcours = ["Un.", "Deux."] as unknown as FilmSpec["textes"]["en"]["parcours"];
    spec.musique.tempo = 247;
    expect(erreursDeLaSpec(spec)).toEqual([
      "marque.couleurs.accent : couleur #RRGGBB attendue",
      "textes.en.parcours : 4 éléments attendus, 2 reçus",
      "musique.tempo : entre 60 et 200 BPM (mesuré par npm run musique)",
    ]);
    expect(() => validerSpec(spec)).toThrow(/Fiche du film invalide \(3\)/);
  });

  it("exige une langue complète : une traduction oubliée ne passe pas", () => {
    const spec = copie() as unknown as { textes: Record<string, unknown> };
    delete spec.textes.en;
    expect(erreursDeLaSpec(spec)).toContain("textes.en : manquant");
  });

  it("distingue un texte vide d'un texte absent : les deux sont refusés", () => {
    const spec = copie();
    spec.textes.fr.evenement.chute = "   ";
    (spec.textes.fr.bascule as Partial<FilmSpec["textes"]["fr"]["bascule"]>).chiffre = undefined;
    expect(erreursDeLaSpec(spec)).toEqual([
      "textes.fr.bascule.chiffre : texte non vide attendu",
      "textes.fr.evenement.chute : texte non vide attendu",
    ]);
  });

  it("vérifie le logo selon sa forme", () => {
    const spec = copie();
    spec.marque.logo = { type: "glyphe", traces: [], logotype: "VAGUA", graisseDuLogotype: 300, espacementDuLogotype: 0.32 };
    expect(erreursDeLaSpec(spec)).toEqual(["marque.logo.traces : au moins un tracé"]);
    (spec.marque as { logo: unknown }).logo = { type: "video" };
    expect(erreursDeLaSpec(spec)).toEqual(["marque.logo.type : « motSymbole », « glyphe » ou « image »"]);
    spec.marque.logo = { type: "image", fichier: "logo/marque.png", rapport: 0, inverser: true };
    expect(erreursDeLaSpec(spec)).toEqual(["marque.logo.rapport : largeur / hauteur, positif"]);
  });

  it("refuse un message de conversation sans auteur connu", () => {
    const spec = copie();
    (spec.textes.fr.probleme.messages[0] as { auteur: string }).auteur = "elle";
    expect(erreursDeLaSpec(spec)).toEqual(["textes.fr.probleme.messages[0].auteur : « moi » ou « autre »"]);
  });

  it("refuse un événement à un seul état : rien ne bascule", () => {
    const spec = copie();
    spec.ecrans.evenement = ["evenement-1.png"];
    expect(erreursDeLaSpec(spec)).toEqual(["ecrans.evenement : au moins deux états, sinon rien ne bascule"]);
  });

  it("refuse deux livrables du même nom, et une fiche sans livrable", () => {
    const spec = copie();
    spec.declinaisons = [spec.declinaisons[0]!, spec.declinaisons[0]!];
    expect(erreursDeLaSpec(spec)).toEqual(["declinaisons[1].nom : « Film-FR » est déjà pris"]);
    spec.declinaisons = [];
    expect(erreursDeLaSpec(spec)).toEqual(["declinaisons : au moins un livrable"]);
  });

  it("exige une légende pour chaque plan d'aperçu", () => {
    const spec = copie();
    spec.apercu.fr = [{ id: "carte", mesures: 2, prise: "parcours", debut: 39.3, fin: 42.5 }];
    expect(erreursDeLaSpec(spec)).toEqual(["textes.fr.apercu.carte : légende manquante"]);
    spec.textes.fr.apercu = { carte: "Votre navette, sur la carte" };
    expect(erreursDeLaSpec(spec)).toEqual([]);
  });

  it("refuse un plan d'aperçu qui finit avant de commencer", () => {
    const spec = copie();
    spec.textes.fr.apercu = { carte: "La carte" };
    spec.apercu.fr = [{ id: "carte", mesures: 2, prise: "parcours", debut: 42, fin: 40 }];
    expect(erreursDeLaSpec(spec)).toEqual(["apercu.fr[0] : debut et fin en secondes, fin après debut"]);
  });
});
