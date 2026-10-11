import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import RemplirDepuisLeSite from "./remplir-depuis-le-site";

function fluxNdjson(evenements: object[]): Response {
  const corps = evenements.map((e) => JSON.stringify(e)).join("\n") + "\n";
  return new Response(corps, { headers: { "Content-Type": "application/x-ndjson" } });
}

const RESUME = { captures: 9, capturesGardees: 0, videos: 4, suggestionsEnAttente: 0, moments: 3, logo: true, redaction: "textes proposés par Claude", textesProposes: 21, aEcrire: ["fr.momentCle"], marque: [] };

afterEach(() => vi.restoreAllMocks());

describe("Remplir depuis ton site", () => {
  it("enregistre d'abord, suit les étapes, relit la fiche et résume ce qui reste à écrire", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      fluxNdjson([{ type: "phase", label: "Ouverture de saya.com…" }, { type: "done", resume: RESUME }]),
    );
    const avantDeLancer = vi.fn(async () => true);
    const recharger = vi.fn(async () => {});
    const onOccupe = vi.fn();
    render(<RemplirDepuisLeSite id="saya" avantDeLancer={avantDeLancer} recharger={recharger} onOccupe={onOccupe} />);
    fireEvent.change(screen.getByLabelText("Adresse de ton site"), { target: { value: "saya.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Remplir" }));
    expect(await screen.findByText(/9 captures, 4 écrans filmés, logo trouvé, 21 textes proposés/)).toBeInTheDocument();
    expect(screen.getByText("À écrire toi-même : le moment clé.")).toBeInTheDocument();
    expect(avantDeLancer).toHaveBeenCalled();
    expect(recharger).toHaveBeenCalled();
    expect(JSON.parse(String(fetch.mock.calls[0]![1]!.body))).toEqual({ url: "saya.com", remplacerCaptures: false });
    expect(onOccupe).toHaveBeenCalledWith(true);
    expect(onOccupe).toHaveBeenLastCalledWith(false);
  });

  it("une erreur du site s'affiche, et la fiche est quand même relue", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(fluxNdjson([{ type: "error", message: "Le site n'a pas pu être lu : timeout" }]));
    const recharger = vi.fn(async () => {});
    render(<RemplirDepuisLeSite id="saya" adresseAuDepart="saya.com" avantDeLancer={async () => true} recharger={recharger} onOccupe={() => {}} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Le site n'a pas pu être lu : timeout");
    await waitFor(() => expect(recharger).toHaveBeenCalled());
  });

  it("une adresse refusée par le serveur le dit, sans lancer de flux", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ erreur: "Cette adresse ne ressemble pas à un site" }, { status: 400 }));
    render(<RemplirDepuisLeSite id="saya" adresseAuDepart="pas un site" avantDeLancer={async () => true} recharger={async () => {}} onOccupe={() => {}} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("ne ressemble pas à un site");
  });

  it("ne lance rien si l'enregistrement préalable échoue", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    render(<RemplirDepuisLeSite id="saya" adresseAuDepart="saya.com" avantDeLancer={async () => false} recharger={async () => {}} onOccupe={() => {}} />);
    await new Promise((r) => setTimeout(r, 20));
    expect(fetch).not.toHaveBeenCalled();
  });
});
