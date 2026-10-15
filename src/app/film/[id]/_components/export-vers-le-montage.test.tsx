import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ExportVersLeMontage from "./export-vers-le-montage";

function reponse(statut: number, corps: unknown, entetes: Record<string, string> = {}): Response {
  return new Response(typeof corps === "string" ? corps : JSON.stringify(corps), { status: statut, headers: entetes });
}

function afficher(avantDExporter = async () => true) {
  render(
    <ExportVersLeMontage
      url="/api/motion/film/saya/cinema/episodes/ep1/otio"
      declinaison="Court-FR"
      nomDuFichier="Court-FR.episode-ep1.otio"
      avantDExporter={avantDExporter}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: /DaVinci Resolve/ }));
}

describe("ExportVersLeMontage", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: vi.fn(() => "blob:x"), revokeObjectURL: vi.fn() }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("télécharge le .otio, dit comment l'ouvrir et où il est enregistré", async () => {
    const appel = vi.fn(async () => reponse(200, "{}", { "X-Logo-Inclus": "oui", "X-Chemin-Otio": encodeURIComponent("/films/saya/out/Court-FR.episode-ep1.otio") }));
    vi.stubGlobal("fetch", appel);
    afficher();
    const statut = await screen.findByRole("status");
    expect(statut).toHaveTextContent("Court-FR.episode-ep1.otio téléchargé");
    expect(statut).toHaveTextContent("/films/saya/out/Court-FR.episode-ep1.otio");
    expect(statut).not.toHaveTextContent("logo");
    expect(appel).toHaveBeenCalledWith("/api/motion/film/saya/cinema/episodes/ep1/otio", expect.objectContaining({ method: "POST", body: JSON.stringify({ declinaison: "Court-FR" }) }));
  });

  it("sans précision sur le logo (export du film), ne parle pas de logo", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => reponse(200, "{}")));
    render(<ExportVersLeMontage url="/api/motion/film/sd/otio" declinaison="Film-FR" nomDuFichier="Film-FR.otio" />);
    fireEvent.click(screen.getByRole("button", { name: /DaVinci Resolve/ }));
    const statut = await screen.findByRole("status");
    expect(statut).toHaveTextContent("Film-FR.otio téléchargé");
    expect(statut).not.toHaveTextContent("logo");
  });

  it("prévient quand le logo manque (épisode pas encore rendu)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => reponse(200, "{}", { "X-Logo-Inclus": "non" })));
    afficher();
    expect(await screen.findByText(/Le logo n'y est pas encore/)).toBeInTheDocument();
  });

  it("affiche la phrase du serveur quand il refuse (plan pas généré)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => reponse(409, { erreur: "Le plan « jardin » n'a pas encore de vidéo : génère-le avant de rendre l'épisode." })));
    afficher();
    expect(await screen.findByRole("alert")).toHaveTextContent("Le plan « jardin » n'a pas encore de vidéo");
  });

  it("n'exporte rien si la fiche n'a pas pu être enregistrée", async () => {
    const appel = vi.fn();
    vi.stubGlobal("fetch", appel);
    const avant = vi.fn(async () => false);
    afficher(avant);
    await waitFor(() => expect(avant).toHaveBeenCalled());
    expect(appel).not.toHaveBeenCalled();
  });

  it("dit clairement quand GEN MOTION ne répond pas", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    afficher();
    expect(await screen.findByRole("alert")).toHaveTextContent("n'a pas pu joindre GEN MOTION");
  });
});
