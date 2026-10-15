import { describe, expect, it } from "vitest";

import { ficheValide } from "../film-fixtures.test-utils";
import { attentesDuGroupe, casesDuGroupe, demandeDeChoix, lireLeChoix, type PageDuSite } from "./choix-des-pages";

const PAGES: PageDuSite[] = [
  { url: "https://maison.fr/", titre: "Accueil" },
  { url: "https://maison.fr/boutique", titre: "Boutique" },
  { url: "https://maison.fr/produit/hibiscus", titre: "Hibiscus" },
  { url: "https://maison.fr/panier", titre: "Panier" },
];

describe("choix des pages par Claude", () => {
  it("la demande numérote les pages et dit ce que chaque case doit montrer", () => {
    const fiche = ficheValide();
    const { message } = demandeDeChoix("Maison", PAGES, attentesDuGroupe(fiche, "fr", "parcours"));
    expect(message).toContain("2. Boutique — https://maison.fr/boutique");
    expect(message).toContain(`Slot 1: Step 1 of the user journey, captioned "${fiche.textes.fr.parcours[0]}"`);
  });

  it("les pages écartées partent avec la demande suivante", () => {
    const { message } = demandeDeChoix("Maison", PAGES, ["x"], ["https://maison.fr/panier"]);
    expect(message).toContain("Already proposed and rejected");
    expect(message).toContain("- https://maison.fr/panier");
  });

  it("lit les numéros de pages, case par case, dans l'ordre", () => {
    const lu = lireLeChoix("parcours", PAGES, 2, { cases: [{ case: 2, page: 4, raison: "On y paie." }, { case: 1, page: 2, raison: "On choisit." }] });
    expect(lu).toEqual({
      ok: true,
      choix: {
        groupe: "parcours",
        pages: PAGES,
        cases: [
          { case: 0, url: "https://maison.fr/boutique", titre: "Boutique", raison: "On choisit." },
          { case: 1, url: "https://maison.fr/panier", titre: "Panier", raison: "On y paie." },
        ],
      },
    });
  });

  it("une page hors de la liste n'est jamais retenue : Claude ne peut pas inventer d'adresse", () => {
    const lu = lireLeChoix("preuve", PAGES, 1, { cases: [{ case: 1, page: 99, raison: "?" }] });
    expect(lu).toMatchObject({ ok: false });
  });

  it("refuse une proposition incomplète plutôt que de laisser une case sans page", () => {
    const lu = lireLeChoix("parcours", PAGES, 4, { cases: [{ case: 1, page: 1, raison: "" }] });
    expect(lu).toMatchObject({ ok: false });
    if (!lu.ok) expect(lu.raison).toContain("1 sur 4");
  });

  it("une page par case du parcours, une seule pour le moment clé et la preuve", () => {
    const fiche = ficheValide();
    expect(casesDuGroupe(fiche, "parcours")).toBe(fiche.ecrans.parcours.length);
    expect(casesDuGroupe(fiche, "moments")).toBe(1);
    expect(casesDuGroupe(fiche, "preuve")).toBe(1);
  });
});
