import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ReglageParoles, { type EtatWhisper } from "./page";

const fetchOriginal = global.fetch;
afterEach(() => {
  global.fetch = fetchOriginal;
});

const MODELES = (presentMedium: boolean): EtatWhisper["modeles"] => [
  { nom: "medium", libelle: "Recommandé (1,5 Go)", octets: 1_000, present: presentMedium },
  { nom: "small", libelle: "Plus léger (490 Mo)", octets: 500, present: false },
];
const etat = (e: Partial<EtatWhisper>): EtatWhisper => ({ cli: true, pret: false, raison: "Aucun modèle whisper", modeles: MODELES(false), ...e });

function flux(lignes: object[]) {
  return new Response(new ReadableStream({ start(c) { for (const l of lignes) c.enqueue(new TextEncoder().encode(`${JSON.stringify(l)}\n`)); c.close(); } }), { status: 200 });
}

describe("Réglages · Écoute locale", () => {
  it("sans whisper.cpp, donne la commande à copier, et dit ce qui manque", async () => {
    global.fetch = vi.fn(async () => Response.json(etat({ cli: false, raison: "whisper.cpp n'est pas installé" }))) as typeof fetch;
    render(<ReglageParoles />);
    expect(await screen.findByText("brew install whisper-cpp")).toBeInTheDocument();
    expect(screen.getAllByRole("status")[0]).toHaveTextContent("whisper.cpp n'est pas installé");
  });

  it("tout est là : prêt, et le modèle est marqué téléchargé", async () => {
    global.fetch = vi.fn(async () => Response.json(etat({ pret: true, raison: null, modeles: MODELES(true) }))) as typeof fetch;
    render(<ReglageParoles />);
    expect(await screen.findByText("Prêt : l'écoute locale fonctionne.")).toBeInTheDocument();
    expect(screen.getByText("Téléchargé")).toBeInTheDocument();
  });

  it("télécharge un modèle en montrant la progression, puis relit l'état", async () => {
    const appels: string[] = [];
    global.fetch = vi.fn(async (url: RequestInfo | URL) => {
      appels.push(String(url));
      if (String(url).endsWith("/telecharger")) return flux([{ type: "progress", recus: 500, total: 1_000 }, { type: "done", ok: true }]);
      return Response.json(appels.length > 2 ? etat({ pret: true, raison: null, modeles: MODELES(true) }) : etat({}));
    }) as typeof fetch;
    render(<ReglageParoles />);
    const utilisateur = userEvent.setup();
    await utilisateur.click((await screen.findAllByRole("button", { name: "Télécharger" }))[0]!);
    expect(await screen.findByText("Téléchargé")).toBeInTheDocument();
    expect(appels).toEqual(["/api/motion/whisper", "/api/motion/whisper/telecharger", "/api/motion/whisper"]);
  });

  it("un téléchargement qui s'arrête sans résultat n'est pas un succès", async () => {
    global.fetch = vi.fn(async (url: RequestInfo | URL) =>
      String(url).endsWith("/telecharger") ? flux([{ type: "progress", recus: 10, total: 1_000 }]) : Response.json(etat({})),
    ) as typeof fetch;
    render(<ReglageParoles />);
    await userEvent.setup().click((await screen.findAllByRole("button", { name: "Télécharger" }))[0]!);
    expect(await screen.findByRole("alert")).toHaveTextContent("s'est arrêté sans résultat");
  });
});
