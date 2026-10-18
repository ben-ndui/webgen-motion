import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import InstallerLeCalage from "./installer-le-calage";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const fetchOriginal = global.fetch;
afterEach(() => {
  global.fetch = fetchOriginal;
  refresh.mockReset();
});

/** Le serveur répond un flux NDJSON fait de ces lignes. */
function serveur(...lignes: object[]) {
  const corps = lignes.map((l) => `${JSON.stringify(l)}\n`).join("");
  global.fetch = vi.fn(async () => new Response(corps, { status: 200 })) as typeof fetch;
}

describe("installer le calage mot à mot", () => {
  it("télécharge, puis dit « Installé » et fait relire l'état des réglages", async () => {
    serveur({ type: "progress", recus: 178_000_000, total: 356_211_531 }, { type: "done", ok: true });
    render(<InstallerLeCalage />);
    fireEvent.click(screen.getByRole("button", { name: "Installer maintenant" }));
    expect(await screen.findByText("Installé")).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith("/api/motion/alignement/telecharger", expect.objectContaining({ method: "POST" }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("un fichier refusé (empreinte) se dit, et propose de réessayer", async () => {
    serveur({ type: "error", message: "Le fichier reçu ne correspond pas au modèle officiel (taille ou empreinte) : refusé." });
    render(<InstallerLeCalage />);
    fireEvent.click(screen.getByRole("button", { name: "Installer maintenant" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("ne correspond pas au modèle officiel");
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("un flux coupé sans résultat n'est PAS une installation réussie", async () => {
    serveur({ type: "progress", recus: 10, total: 356_211_531 });
    render(<InstallerLeCalage />);
    fireEvent.click(screen.getByRole("button", { name: "Installer maintenant" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("s'est arrêté sans résultat");
    expect(screen.queryByText("Installé")).not.toBeInTheDocument();
  });

  it("fenêtre rouverte en pleine installation : « en cours », jamais un « Réessayer » qui doublerait", async () => {
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ error: "L'installation est déjà en cours." }), { status: 409 })) as typeof fetch;
    render(<InstallerLeCalage />);
    fireEvent.click(screen.getByRole("button", { name: "Installer maintenant" }));
    expect(await screen.findByText(/Installation en cours/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("l'état lu dit l'installation en cours : pas de bouton", () => {
    render(<InstallerLeCalage enCours />);
    expect(screen.getByText(/Installation en cours/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("déjà installé : rien à télécharger", () => {
    render(<InstallerLeCalage installe />);
    expect(screen.getByText("Installé")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
