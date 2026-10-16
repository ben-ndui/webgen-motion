import { describe, expect, it } from "vitest";

import { parametresDeLaSession } from "./stripe-session";

const CONSENTEMENT = { achat_professionnel: "oui", cgv_acceptees: "16/10/2026" };
const BASE = "https://genmotion.app";

function pour(plan: "monthly" | "annual" | "lifetime") {
  const mode = plan === "lifetime" ? ("payment" as const) : ("subscription" as const);
  return parametresDeLaSession({ resolved: { plan, priceId: `price_${plan}`, mode, edition: "studio" }, plan, base: BASE, consentement: CONSENTEMENT });
}

describe("paramètres de la Checkout Session Studio", () => {
  it("les réglages du Checkout Studio, avec nos deux écarts : web, et pas de téléphone", () => {
    for (const plan of ["monthly", "annual", "lifetime"] as const) {
      const p = pour(plan);
      expect(p).toMatchObject({
        ui_mode: "hosted_page",
        origin_context: "web",
        billing_address_collection: "auto",
        automatic_tax: { enabled: false },
        allow_promotion_codes: true,
        submit_type: "auto",
        integration_identifier: "hosted_mobile_app_0001",
      });
      expect(p).not.toHaveProperty("phone_number_collection");
    }
  });

  it("à vie : achat unique, client créé (pour l'email de licence), carte enregistrable", () => {
    const p = pour("lifetime");
    expect(p.mode).toBe("payment");
    expect(p.customer_creation).toBe("always");
    expect(p.saved_payment_method_options).toEqual({ payment_method_save: "enabled" });
    expect(p).not.toHaveProperty("payment_method_collection");
    expect(p).not.toHaveProperty("subscription_data");
  });

  it("abonnement : carte toujours demandée, et l'offre voyage avec l'abonnement pour les renouvellements", () => {
    for (const plan of ["monthly", "annual"] as const) {
      const p = pour(plan);
      expect(p.mode).toBe("subscription");
      expect(p.payment_method_collection).toBe("always");
      expect(p.subscription_data?.metadata).toEqual({ plan, edition: "studio", ...CONSENTEMENT });
      // customer_creation n'existe qu'en mode payment ; enregistrer la carte est inutile (l'abonnement la garde).
      expect(p).not.toHaveProperty("customer_creation");
      expect(p).not.toHaveProperty("saved_payment_method_options");
    }
  });

  it("garde ce dont tout dépend : l'offre, la preuve d'achat pro, le bon prix, les adresses de retour", () => {
    const p = pour("annual");
    expect(p.metadata).toEqual({ product: "studio-edition", plan: "annual", source: "webgen-motion-landing", ...CONSENTEMENT });
    expect(p.line_items).toEqual([{ price: "price_annual", quantity: 1 }]);
    expect(p.success_url).toBe(`${BASE}/thanks?session_id={CHECKOUT_SESSION_ID}`);
    expect(p.cancel_url).toBe(`${BASE}/download`);
  });
});
