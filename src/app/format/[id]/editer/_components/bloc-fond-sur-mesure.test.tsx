import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { KaraokeSpec } from "../../../../../../remotion/film/karaoke/spec";
import { projetDeDepart } from "@/lib/formats/format-loader";
import BlocFondSurMesure from "./bloc-fond-sur-mesure";

const fetchOriginal = global.fetch;
afterEach(() => {
  global.fetch = fetchOriginal;
});

function spec(description: string): KaraokeSpec {
  const s = (projetDeDepart("karaoke", "clip") as { spec: KaraokeSpec }).spec;
  s.decor = "sur-mesure";
  s.fond = { description, videos: {} };
  return s;
}

describe("le décor sur mesure", () => {
  it("un bouton par format rendu, prix compris ; pas de génération sans description", async () => {
    global.fetch = vi.fn(async () => Response.json({ etat: "aucun" })) as typeof fetch;
    render(<BlocFondSurMesure id="clip" spec={spec("")} prixUsd="0,64 $" modifier={() => {}} enregistrer={async () => true} />);
    const boutons = await screen.findAllByRole("button", { name: "Générer ce décor (0,64 $)" });
    expect(boutons).toHaveLength(2);
    for (const bouton of boutons) expect(bouton).toBeDisabled();
    expect(screen.getByText(/tes paroles sont envoyées à Claude/)).toBeInTheDocument();
  });

  it("propose trois décors d'après les paroles, et « Prendre celui-ci » remplit la description", async () => {
    const modifier = vi.fn();
    global.fetch = vi.fn(async (url: RequestInfo | URL) =>
      String(url).endsWith("/proposer")
        ? Response.json({ propositions: [{ titre: "Rendez-vous sous la pluie", description: "Une rue la nuit, néons orange." }] })
        : Response.json({ etat: "aucun" }),
    ) as typeof fetch;
    render(<BlocFondSurMesure id="clip" spec={spec("")} prixUsd="0,64 $" modifier={modifier} enregistrer={async () => true} />);
    const utilisateur = userEvent.setup();
    await utilisateur.click(screen.getByRole("button", { name: "Proposer avec Claude d'après tes paroles" }));
    await utilisateur.click(await screen.findByRole("button", { name: "Prendre celui-ci" }));
    const s = spec("");
    modifier.mock.calls[0]![0](s);
    expect(s.fond?.description).toBe("Une rue la nuit, néons orange.");
  });

  it("enregistre la description AVANT de lancer la génération payante, puis la suit", async () => {
    const ordre: string[] = [];
    global.fetch = vi.fn(async (_url: RequestInfo | URL, options?: RequestInit) => {
      ordre.push(options?.method ?? "GET");
      return Response.json(options?.method === "POST" ? { etat: "en-cours", coutUsd: 0.64 } : { etat: "aucun" });
    }) as typeof fetch;
    const enregistrer = vi.fn(async () => { ordre.push("ENREGISTRER"); return true; });
    const s = spec("Une plage la nuit");
    s.declinaisons = s.declinaisons.filter((d) => d.version === "court");
    render(<BlocFondSurMesure id="clip" spec={s} prixUsd="0,64 $" modifier={() => {}} enregistrer={enregistrer} />);
    await userEvent.setup().click(await screen.findByRole("button", { name: "Générer ce décor (0,64 $)" }));
    expect(await screen.findByText(/Google fabrique ton décor/)).toBeInTheDocument();
    expect(ordre.slice(1, 3)).toEqual(["ENREGISTRER", "POST"]);
  });

  it("hors Studio, le dit, sans proposer de bouton qui ne peut pas aboutir", async () => {
    global.fetch = vi.fn(async () => Response.json({ error: "studio-required" }, { status: 403 })) as typeof fetch;
    render(<BlocFondSurMesure id="clip" spec={spec("Une plage")} prixUsd="0,64 $" modifier={() => {}} enregistrer={async () => true} />);
    expect((await screen.findAllByRole("alert"))[0]).toHaveTextContent("fonction Studio");
    expect(screen.queryByRole("button", { name: /Générer ce décor/ })).not.toBeInTheDocument();
  });
});
