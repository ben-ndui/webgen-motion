import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import BlocParoles from "./bloc-paroles";

const fetchOriginal = global.fetch;
afterEach(() => {
  global.fetch = fetchOriginal;
});

function serveur(etat: Record<string, unknown>) {
  global.fetch = vi.fn(async () => new Response(JSON.stringify(etat), { status: 200 })) as typeof fetch;
}

const SANS_RIEN = { brouillon: null, texte: null, calees: null, whisper: { ok: true } };

describe("les paroles d'un karaoké", () => {
  it("dit en clair que whisper manque, et ne propose ni écoute ni calage", async () => {
    serveur({ ...SANS_RIEN, whisper: { ok: false, raison: "whisper.cpp n'est pas installé : dans un terminal, « brew install whisper-cpp »." } });
    render(<BlocParoles id="clip" morceauPresent />);
    expect(await screen.findByRole("alert")).toHaveTextContent("brew install whisper-cpp");
    expect(screen.queryByRole("button", { name: /Écouter le morceau/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Caler mes paroles sur le morceau" })).toBeDisabled();
  });

  it("sans morceau, demande de le déposer d'abord", async () => {
    serveur(SANS_RIEN);
    render(<BlocParoles id="clip" morceauPresent={false} />);
    expect(await screen.findByText(/Dépose d'abord ton morceau/)).toBeInTheDocument();
  });

  it("propose le brouillon de whisper à corriger, puis le calage", async () => {
    serveur({ ...SANS_RIEN, brouillon: "On s'est donné rendez-vous\nA l'époque\n" });
    render(<BlocParoles id="clip" morceauPresent />);
    expect(await screen.findByRole("textbox", { name: /Le texte, une ligne par ligne affichée/ })).toHaveValue("On s'est donné rendez-vous\nA l'époque\n");
    expect(screen.getByRole("button", { name: "Réécouter le morceau" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Caler mes paroles sur le morceau" })).toBeEnabled();
  });

  it("des paroles calées sur le brouillon sont signalées : le rendu les refusera", async () => {
    serveur({ ...SANS_RIEN, texte: "x", calees: { source: "paroles-brouillon.txt", reconnus: 1, lignes: 78 } });
    render(<BlocParoles id="clip" morceauPresent />);
    expect(await screen.findByText(/78 lignes, 100 % des mots reconnus \(sur le brouillon de whisper : le rendu le refusera\)/)).toBeInTheDocument();
  });

  it("une lecture ratée se dit, jamais comme des paroles vides", async () => {
    global.fetch = vi.fn(async () => new Response("", { status: 500 })) as typeof fetch;
    render(<BlocParoles id="clip" morceauPresent />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Les paroles ne se lisent pas");
  });
});
