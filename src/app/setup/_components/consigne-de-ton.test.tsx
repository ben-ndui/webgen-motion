import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CONSIGNE_DE_TON_CONSEILLEE } from "@/lib/voix/consigne";

import ConsigneDeTon from "./consigne-de-ton";

afterEach(() => vi.restoreAllMocks());

function serveur(instruct: string | undefined, ok = true) {
  const envois: unknown[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
    if (init?.method === "PUT") {
      envois.push(JSON.parse(String(init.body)));
      return new Response("{}", { status: ok ? 200 : 500 });
    }
    return Response.json({ voicebox: { instruct } });
  });
  return envois;
}

describe("la consigne de ton", () => {
  it("affiche la consigne enregistrée et l'enregistre en quittant la case", async () => {
    const envois = serveur("Calme et posée.");
    render(<ConsigneDeTon />);
    const zone = await screen.findByRole("textbox", { name: "Consigne de ton (Qwen)" });
    expect(zone).toHaveValue("Calme et posée.");
    fireEvent.change(zone, { target: { value: "Très enjouée." } });
    fireEvent.blur(zone);
    expect(await screen.findByRole("status")).toHaveTextContent("Enregistrée");
    expect(envois).toEqual([{ voicebox: { instruct: "Très enjouée." } }]);
  });

  it("propose de reprendre la consigne conseillée, et ne le propose plus quand c'est elle", async () => {
    const envois = serveur("");
    render(<ConsigneDeTon />);
    fireEvent.click(await screen.findByRole("button", { name: "Reprendre la consigne conseillée" }));
    expect(await screen.findByRole("textbox")).toHaveValue(CONSIGNE_DE_TON_CONSEILLEE);
    expect(envois).toEqual([{ voicebox: { instruct: CONSIGNE_DE_TON_CONSEILLEE } }]);
    expect(screen.queryByRole("button", { name: "Reprendre la consigne conseillée" })).not.toBeInTheDocument();
  });

  it("un enregistrement raté se dit", async () => {
    serveur("x", false);
    render(<ConsigneDeTon />);
    const zone = await screen.findByRole("textbox");
    fireEvent.change(zone, { target: { value: "y" } });
    fireEvent.blur(zone);
    expect(await screen.findByRole("alert")).toHaveTextContent("ne s'enregistre pas");
  });

  it("quitter la case sans rien changer n'envoie rien et n'affirme rien", async () => {
    const envois = serveur("Calme.");
    render(<ConsigneDeTon />);
    fireEvent.blur(await screen.findByRole("textbox"));
    await new Promise((r) => setTimeout(r, 20));
    expect(envois).toEqual([]);
    expect(screen.queryByText(/Enregistrée/)).not.toBeInTheDocument();
  });

  it("une lecture ratée ne montre AUCUNE case : rien ne peut écraser la consigne enregistrée", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 500 }));
    render(<ConsigneDeTon />);
    expect(await screen.findByRole("alert")).toHaveTextContent("ne se lit pas");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
