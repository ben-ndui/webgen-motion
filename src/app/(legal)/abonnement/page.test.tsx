import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import GererMonAbonnement from "./page";

const AVANT = process.env.STRIPE_PORTAL_LOGIN_URL;
afterEach(() => {
  if (AVANT === undefined) delete process.env.STRIPE_PORTAL_LOGIN_URL;
  else process.env.STRIPE_PORTAL_LOGIN_URL = AVANT;
});

describe("Gérer mon abonnement", () => {
  it("avec le portail Stripe : un bouton y mène", () => {
    process.env.STRIPE_PORTAL_LOGIN_URL = "https://billing.stripe.com/p/login/test_123";
    render(<GererMonAbonnement />);
    expect(screen.getByRole("link", { name: "Ouvrir mon espace d'abonnement" })).toHaveAttribute("href", "https://billing.stripe.com/p/login/test_123");
    expect(screen.getByText(/s'arrête à la fin de la période déjà payée/)).toBeInTheDocument();
  });

  it("sans portail : la résiliation passe par l'email, jamais une impasse", () => {
    delete process.env.STRIPE_PORTAL_LOGIN_URL;
    render(<GererMonAbonnement />);
    expect(screen.queryByRole("link", { name: "Ouvrir mon espace d'abonnement" })).toBeNull();
    const email = screen.getByRole("link", { name: "contact@smoothandesign.fr" });
    expect(email.getAttribute("href")).toContain("mailto:contact@smoothandesign.fr?subject=R%C3%A9siliation");
  });
});
