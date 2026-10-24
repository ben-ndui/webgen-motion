import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ChoixDuProfil from "./choix-du-profil";

afterEach(() => vi.restoreAllMocks());

describe("Choix du profil d'interface", () => {
  it("lit le profil actuel au montage et le marque « Actif »", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ profilInterface: "serie" }));
    render(<ChoixDuProfil />);
    const serie = await screen.findByRole("radio", { name: /Série/ });
    expect(serie).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /Complet/ })).toHaveAttribute("aria-checked", "false");
  });

  it("choisir « Série » l'enregistre et le marque actif immédiatement (optimiste)", async () => {
    const appels: unknown[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, options) => {
      if (options?.method === "PUT") {
        appels.push(JSON.parse(String(options.body)));
        return Response.json({ profilInterface: "serie" });
      }
      return Response.json({ profilInterface: "complet" });
    });
    render(<ChoixDuProfil />);
    await screen.findByRole("radio", { name: /Complet/, checked: true });
    fireEvent.click(screen.getByRole("radio", { name: /Série/ }));
    await waitFor(() => expect(screen.getByRole("radio", { name: /Série/ })).toHaveAttribute("aria-checked", "true"));
    expect(appels).toEqual([{ interface: { profil: "serie" } }]);
  });

  it("un enregistrement qui échoue revient au profil précédent et le dit", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ profilInterface: "complet" }))
      .mockResolvedValueOnce(new Response("", { status: 500 }));
    render(<ChoixDuProfil />);
    await screen.findByRole("radio", { name: /Complet/, checked: true });
    fireEvent.click(screen.getByRole("radio", { name: /Série/ }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Le profil n'a pas été enregistré"));
    expect(screen.getByRole("radio", { name: /Complet/ })).toHaveAttribute("aria-checked", "true");
  });

  it("des réglages illisibles le disent, sans proposer un choix à l'aveugle", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 500 }));
    render(<ChoixDuProfil />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Tes réglages ne se lisent pas");
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });
});
