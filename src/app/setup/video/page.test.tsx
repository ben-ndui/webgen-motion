import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ReglageVideo from "./page";

function configAvec(veo: { hasApiKey: boolean; apiKeyMasked: string | null; hasEnvKey: boolean }) {
  return Response.json({ veo });
}

afterEach(() => vi.restoreAllMocks());

describe("Réglages · Vidéo IA", () => {
  it("sans clé : le dit, et enregistre celle qu'on colle", async () => {
    const appels = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(configAvec({ hasApiKey: false, apiKeyMasked: null, hasEnvKey: false }))
      .mockResolvedValueOnce(Response.json({}))
      .mockResolvedValueOnce(configAvec({ hasApiKey: true, apiKeyMasked: "AIza••••wxyz", hasEnvKey: false }));
    render(<ReglageVideo />);
    expect(await screen.findByText("Aucune clé : la série vidéo est bloquée.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Colle ta clé"), { target: { value: "  AIza-cle-de-test  " } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(await screen.findByText("Enregistrée : AIza••••wxyz")).toBeInTheDocument();
    const [, options] = appels.mock.calls[1] as [string, RequestInit];
    expect(options.method).toBe("PUT");
    expect(JSON.parse(String(options.body))).toEqual({ veo: { apiKey: "AIza-cle-de-test" } });
    // une clé enregistrée n'est pas une clé acceptée par Google : l'écran ne le prétend pas
    expect(screen.getByText(/Ton premier plan généré dira si Google l.accepte/)).toBeInTheDocument();
  });

  it("une clé présente se retire", async () => {
    const appels = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(configAvec({ hasApiKey: true, apiKeyMasked: "AIza••••wxyz", hasEnvKey: false }))
      .mockResolvedValueOnce(Response.json({}))
      .mockResolvedValueOnce(configAvec({ hasApiKey: false, apiKeyMasked: null, hasEnvKey: false }));
    render(<ReglageVideo />);
    fireEvent.click(await screen.findByRole("button", { name: "Retirer la clé" }));
    expect(await screen.findByText("Clé retirée.")).toBeInTheDocument();
    expect(JSON.parse(String((appels.mock.calls[1] as [string, RequestInit])[1].body))).toEqual({ veo: { apiKey: "" } });
  });

  it("des réglages illisibles le disent au lieu d'afficher « aucune clé »", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 500 }));
    render(<ReglageVideo />);
    expect(await screen.findByText(/Tes réglages ne se lisent pas/)).toBeInTheDocument();
  });

  it("un enregistrement refusé le dit, et garde la clé saisie", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(configAvec({ hasApiKey: false, apiKeyMasked: null, hasEnvKey: false }))
      .mockResolvedValueOnce(new Response("", { status: 500 }));
    render(<ReglageVideo />);
    const champ = await screen.findByLabelText("Colle ta clé");
    fireEvent.change(champ, { target: { value: "AIza-x" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("La clé n'a pas été enregistrée"));
    expect(champ).toHaveValue("AIza-x");
  });
});
