import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { LEGAL } from "./config";
import Cgv from "@/app/(legal)/cgv/page";

/**
 * Les pages légales doivent dire ce que la caisse encaisse. Jusqu'au
 * 15/10/2026 elles affichaient « 49 USD » alors que Stripe encaissait 199 €.
 */
describe("Pages légales — prix et licence réels", () => {
  it("Studio coûte 199 € en licence à vie, en euros", () => {
    expect(LEGAL.product.editions.studio.price).toContain("199 €");
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
    expect(container.textContent).toContain("euros (EUR)");
    expect(container.textContent).not.toMatch(/dollars|USD/);
  });
});
