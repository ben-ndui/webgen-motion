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
  it("enregistre d'abord, ouvre le suivi, coche les étapes, puis montre le récap et ce qui reste à faire", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      fluxNdjson([
        { type: "phase", etape: "ouverture", label: "Ouverture de saya.com…" },
        { type: "phase", etape: "captures", label: "Capture de la page 2 du parcours…" },
        { type: "apercu", numero: 1 },
        { type: "done", resume: RESUME },
      ]),
    );
    const avantDeLancer = vi.fn(async () => true);
    const recharger = vi.fn(async () => {});
    const onOccupe = vi.fn();
    const onAller = vi.fn();
    render(<RemplirDepuisLeSite id="saya" avantDeLancer={avantDeLancer} recharger={recharger} onOccupe={onOccupe} onAller={onAller} />);
    fireEvent.change(screen.getByLabelText("Adresse de ton site"), { target: { value: "saya.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Remplir" }));

    const fenetre = await screen.findByRole("dialog", { name: "C'est rempli" });
    expect(fenetre).toHaveTextContent("Remplir depuis saya.com");
    expect(fenetre).toHaveTextContent("9captures");
    expect(fenetre).toHaveTextContent("Trouvélogo");
    expect(fenetre.querySelector('img[src="/api/motion/film/saya/remplir/apercu?n=1"]')).not.toBeNull();
    expect(screen.getByText("Écrire toi-même le moment clé")).toBeInTheDocument();

    // chaque chose à faire mène au bon onglet, et ferme la fenêtre
    fireEvent.click(screen.getByRole("button", { name: "Écrire" }));
    expect(onAller).toHaveBeenCalledWith("histoire");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("C'est rempli. 9 captures, 21 textes proposés.");

    expect(avantDeLancer).toHaveBeenCalled();
    expect(recharger).toHaveBeenCalled();
    expect(JSON.parse(String(fetch.mock.calls[0]![1]!.body))).toEqual({ url: "saya.com", remplacerCaptures: false });
    expect(onOccupe).toHaveBeenCalledWith(true);
    expect(onOccupe).toHaveBeenLastCalledWith(false);
  });

  it("pendant le travail : les étapes se cochent, et la fenêtre se réduit dans le coin sans rien arrêter", async () => {
    let finir: (r: Response) => void = () => {};
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise((r) => { finir = r; }));
    render(<RemplirDepuisLeSite id="saya" adresseAuDepart="saya.com" avantDeLancer={async () => true} recharger={async () => {}} onOccupe={() => {}} />);
    const fenetre = await screen.findByRole("dialog", { name: "GEN MOTION lit ton site" });
    expect(fenetre).toHaveTextContent("Ouverture du site : en cours");
    expect(fenetre).toHaveTextContent("Captures des pages : à venir");

    fireEvent.click(screen.getByRole("button", { name: "Réduire" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    const carte = screen.getByRole("button", { name: /Étape 1 sur 5 · Ouverture du site\. Agrandir/ });
    fireEvent.click(carte);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Échap réduit aussi, il n'arrête pas
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: /Agrandir le suivi/ })).toBeInTheDocument();
    finir(fluxNdjson([{ type: "done", resume: RESUME }]));
    expect(await screen.findByRole("button", { name: /C'est rempli\. Agrandir/ })).toBeInTheDocument();
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
