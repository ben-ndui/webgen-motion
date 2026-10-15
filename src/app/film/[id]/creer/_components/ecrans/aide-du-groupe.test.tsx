import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ficheValide } from "@/lib/film-fixtures.test-utils";
import { adresseConnue } from "./adresse-du-site";
import AideDuGroupe from "./aide-du-groupe";

const PAGES = [
  { url: "https://maison.fr/", titre: "Accueil" },
  { url: "https://maison.fr/boutique", titre: "Boutique" },
  { url: "https://maison.fr/panier", titre: "Panier" },
];
const CHOIX = { groupe: "preuve", pages: PAGES, cases: [{ case: 0, url: "https://maison.fr/panier", titre: "Panier", raison: "On y paie : c'est la preuve." }] };

/** Une réponse NDJSON, comme la route qui relaie le runner. */
function flux(...evenements: unknown[]) {
  return new Response(evenements.map((e) => JSON.stringify(e)).join("\n") + "\n", { status: 200 });
}

function afficher(appels: Response[], adresse: string | null = "https://maison.fr/") {
  const fetch = vi.fn(async () => appels.shift()!);
  vi.stubGlobal("fetch", fetch);
  const avantDeFilmer = vi.fn(async () => true);
  const apresLeFilmage = vi.fn(async () => undefined);
  render(<AideDuGroupe id="saya" groupe="preuve" cases={["Preuve"]} adresse={adresse} avantDeFilmer={avantDeFilmer} apresLeFilmage={apresLeFilmage} />);
  return { fetch, avantDeFilmer, apresLeFilmage };
}

const corps = (fetch: ReturnType<typeof vi.fn>, n: number) => JSON.parse((fetch.mock.calls[n] as unknown as [string, RequestInit])[1].body as string);

describe("AideDuGroupe (Tes écrans)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("Claude propose une page par case avec sa raison ; rien n'est filmé avant « Garder »", async () => {
    const { fetch, avantDeFilmer } = afficher([flux({ type: "phase", label: "Claude choisit les pages…" }, { type: "done", choix: CHOIX })]);
    fireEvent.click(screen.getByRole("button", { name: "Choisir les pages avec Claude" }));
    const proposition = await screen.findByRole("region", { name: "Pages proposées par Claude" });
    expect(proposition).toHaveTextContent("On y paie : c'est la preuve.");
    expect(corps(fetch, 0)).toEqual({ geste: "proposer", url: "https://maison.fr/", aEviter: [], groupe: "preuve" });
    expect(avantDeFilmer).not.toHaveBeenCalled();
  });

  it("on peut changer la page d'une case, et c'est CELLE-LÀ qui est filmée", async () => {
    const { fetch, avantDeFilmer, apresLeFilmage } = afficher([flux({ type: "done", choix: CHOIX }), flux({ type: "done", resume: { posees: 2, echecs: [] } })]);
    fireEvent.click(screen.getByRole("button", { name: "Choisir les pages avec Claude" }));
    fireEvent.change(await screen.findByRole("combobox"), { target: { value: "https://maison.fr/boutique" } });
    // La raison de Claude ne vaut que pour SA page : elle disparaît quand on en choisit une autre.
    expect(screen.queryByText("On y paie : c'est la preuve.")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Garder et filmer" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Case filmée.");
    expect(corps(fetch, 1)).toMatchObject({ geste: "filmer", pages: ["https://maison.fr/boutique"] });
    expect(avantDeFilmer).toHaveBeenCalled();
    expect(apresLeFilmage).toHaveBeenCalled();
  });

  it("« Autre proposition » écarte les pages déjà proposées", async () => {
    const { fetch } = afficher([flux({ type: "done", choix: CHOIX }), flux({ type: "done", choix: CHOIX })]);
    fireEvent.click(screen.getByRole("button", { name: "Choisir les pages avec Claude" }));
    fireEvent.click(await screen.findByRole("button", { name: "Autre proposition" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(corps(fetch, 1).aEviter).toEqual(["https://maison.fr/panier"]);
  });

  it("dit ce qui n'a pas pu être filmé, et relit quand même la fiche après une erreur", async () => {
    const { apresLeFilmage } = afficher([flux({ type: "done", choix: CHOIX }), flux({ type: "error", message: "Aucune page ne s'est ouverte : la preuve." })]);
    fireEvent.click(screen.getByRole("button", { name: "Choisir les pages avec Claude" }));
    fireEvent.click(await screen.findByRole("button", { name: "Garder et filmer" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Aucune page ne s'est ouverte");
    expect(apresLeFilmage).toHaveBeenCalled();
  });

  it("le refus du serveur (déjà occupé) s'affiche tel quel", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ erreur: "GEN MOTION lit déjà le site de ce film : attends la fin." }), { status: 409 })));
    render(<AideDuGroupe id="saya" groupe="preuve" cases={["Preuve"]} adresse="https://maison.fr/" avantDeFilmer={async () => true} apresLeFilmage={async () => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: "Choisir les pages avec Claude" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("lit déjà le site");
  });

  it("sans adresse, le bouton attend et dit pourquoi", () => {
    afficher([], null);
    expect(screen.getByRole("button", { name: "Choisir les pages avec Claude" })).toBeDisabled();
    expect(screen.getByText(/Indique l'adresse de ton site/)).toBeInTheDocument();
  });
});

describe("adresseConnue", () => {
  it("prend l'adresse donnée à l'ouverture, sinon celle de la fin du film, sinon rien", () => {
    const fiche = ficheValide();
    expect(adresseConnue(fiche, "maison.fr")).toBe("maison.fr");
    fiche.textes.fr.fin.disponible = "Disponible sur maisonsaya.com/fr";
    expect(adresseConnue(fiche)).toBe("maisonsaya.com/fr");
    fiche.textes.fr.fin.disponible = "Bientôt disponible";
    fiche.textes.en.fin.disponible = "Coming soon";
    expect(adresseConnue(fiche)).toBe("");
  });
});
