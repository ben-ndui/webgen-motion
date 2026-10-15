import { describe, expect, it } from "vitest";

import { argumentsDuRunner, lireLaDemandeDEcrans } from "./demande-d-ecrans";
import { prendreLeSite, rendreLeSite } from "./verrou-du-site";

describe("demande de « Tes écrans »", () => {
  it("proposer : l'adresse est complétée, les pages écartées passent au runner", () => {
    const demande = lireLaDemandeDEcrans({ geste: "proposer", url: "maison.fr", groupe: "parcours", aEviter: ["maison.fr/panier"] });
    expect(demande).toEqual({ geste: "proposer", url: "https://maison.fr/", groupe: "parcours", aEviter: ["https://maison.fr/panier"] });
    if ("erreur" in demande) return;
    expect(argumentsDuRunner("saya", demande)).toEqual(["proposer", "--film-id", "saya", "--url", "https://maison.fr/", "--groupe", "parcours", "--eviter", "https://maison.fr/panier"]);
  });

  it("filmer : une page par case, quatre au plus, chacune en argument à part", () => {
    const pages = ["maison.fr/a", "maison.fr/b", "maison.fr/c", "maison.fr/d", "maison.fr/e"];
    const demande = lireLaDemandeDEcrans({ geste: "filmer", url: "maison.fr", groupe: "parcours", pages });
    if ("erreur" in demande) throw new Error(demande.erreur);
    expect(demande.geste === "filmer" && demande.pages).toHaveLength(4);
    expect(argumentsDuRunner("saya", demande).filter((a) => a === "--page")).toHaveLength(4);
  });

  it("refuse une adresse qui n'est pas un site, un groupe inconnu, un geste inconnu, rien à filmer", () => {
    expect(lireLaDemandeDEcrans({ geste: "proposer", url: "javascript:alert(1)", groupe: "parcours" })).toHaveProperty("erreur");
    expect(lireLaDemandeDEcrans({ geste: "proposer", url: "maison.fr", groupe: "inconnu" })).toHaveProperty("erreur");
    expect(lireLaDemandeDEcrans({ geste: "effacer", url: "maison.fr", groupe: "preuve" })).toHaveProperty("erreur");
    expect(lireLaDemandeDEcrans({ geste: "filmer", url: "maison.fr", groupe: "preuve", pages: ["ftp://x"] })).toHaveProperty("erreur");
  });

  it("un seul navigateur à la fois par film, rendu à la fin", () => {
    expect(prendreLeSite("film-verrou")).toBe(true);
    expect(prendreLeSite("film-verrou")).toBe(false);
    expect(prendreLeSite("autre-film")).toBe(true);
    rendreLeSite("film-verrou");
    expect(prendreLeSite("film-verrou")).toBe(true);
    rendreLeSite("film-verrou");
    rendreLeSite("autre-film");
  });
});
