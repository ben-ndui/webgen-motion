import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { PRIX_STUDIO } from "../offre-studio";
import { LEGAL } from "./config";
import Cgv from "@/app/(legal)/cgv/page";

/**
 * Les pages légales doivent dire ce que la caisse encaisse. Jusqu'au
 * 15/10/2026 elles affichaient « 49 USD » alors que Stripe encaissait 199 €.
 */
describe("Pages légales — prix et licence réels", () => {
  it("Studio coûte 199 € en licence à vie, en euros", () => {
    expect(LEGAL.product.editions.studio.price).toContain("199 € en une fois");
    expect(LEGAL.product.editions.studio.price).not.toMatch(/USD|\$|49/);
  });

  it("Studio ne promet pas de fonction qui n'existe pas", () => {
    for (const promesse of ["watermark", "filigrane", "music library", "multi-format"]) {
      expect(LEGAL.product.editions.studio.scope.toLowerCase()).not.toContain(promesse);
    }
  });

  it("la licence est la FSL, pas « Open-core MIT »", () => {
    expect(LEGAL.product.license).toMatch(/^FSL-1\.1-MIT/);
  });

  it("les CGV parlent d'euros, plus de dollars", () => {
    const { container } = render(<Cgv />);
    expect(container.textContent).toContain("en euros");
    expect(container.textContent).not.toMatch(/dollars|USD/);
  });
});

describe("CGV du 16/10/2026 — ce qui est vraiment vendu, à qui, et comment on en sort", () => {
  const texte = () => render(<Cgv />).container.textContent ?? "";

  it("les trois offres vendues sont dans les CGV, aux prix de la page d'achat", () => {
    expect(texte()).toContain(`Licence à vie : ${PRIX_STUDIO.aVie} €`);
    expect(texte()).toContain(`Abonnement annuel : ${PRIX_STUDIO.annuel} € par an`);
    expect(texte()).toContain(`Abonnement mensuel : ${PRIX_STUDIO.mensuel} € par mois`);
  });

  it("réservées aux professionnels, et la résiliation a une page", () => {
    const { container } = render(<Cgv />);
    expect(container.textContent).toContain("exclusivement aux professionnels");
    expect(container.textContent).toContain("résilie à tout moment");
    expect(container.querySelector('a[href="/abonnement"]')).not.toBeNull();
  });

  it("l'identité est celle d'aujourd'hui : Vallauris, SIREN, RNE ; ni Nice, ni SIRET d'un établissement fermé", () => {
    const t = texte();
    expect(t).toContain("9 impasse Allègre, 06220 Vallauris");
    expect(t).toContain("SIREN 904 264 223");
    expect(t).not.toMatch(/Nice|Gazan|SIRET|RCS/);
  });

  it("aucune clause qui impose un tribunal (elle ne vaut qu'entre commerçants)", () => {
    expect(texte()).not.toMatch(/compétence exclusive|tribunaux compétents de/);
  });
});
