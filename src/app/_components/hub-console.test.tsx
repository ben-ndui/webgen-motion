import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import HubConsole from "./hub-console";

const barre = () => screen.queryByRole("navigation", { name: "Navigation du studio" });
const feuille = () => screen.queryByRole("region", { name: "Console IA" });

/** Laisse passer l'image où la console relit ce qu'elle a retenu. */
async function apresLeMontage() {
  await act(() => new Promise((fin) => requestAnimationFrame(() => fin(undefined))));
}

describe("HubConsole : la console prend la place de la barre du bas", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("motion-console-mock", "1");
  });
  afterEach(() => localStorage.clear());

  it("fermée : la barre est là, avec un onglet Console en plus des trois pages", async () => {
    render(<HubConsole actif="videos" />);
    await apresLeMontage();
    expect(barre()).toBeInTheDocument();
    const onglet = screen.getByRole("button", { name: "Console" });
    expect(onglet).toHaveAttribute("aria-pressed", "false");
    expect(feuille()).toBeNull();
  });

  it("l'onglet ouvre la feuille et la barre DISPARAÎT ; ✕ la ramène", async () => {
    render(<HubConsole actif="videos" />);
    await apresLeMontage();
    await userEvent.click(screen.getByRole("button", { name: "Console" }));
    expect(feuille()).toBeInTheDocument();
    expect(barre()).toBeNull();
    expect(localStorage.getItem("motion-hubconsole-mode")).toBe("feuille");
    await waitFor(() => expect(screen.getByRole("textbox")).toHaveFocus()); // le curseur est prêt

    await userEvent.click(screen.getByRole("button", { name: "Fermer la console (Échap)" }));
    expect(feuille()).toBeNull();
    expect(barre()).toBeInTheDocument();
  });

  it("Échap referme la feuille ; ⌘J l'ouvre et la referme", async () => {
    render(<HubConsole actif="videos" />);
    await apresLeMontage();
    await userEvent.keyboard("{Meta>}j{/Meta}");
    expect(feuille()).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(barre()).toBeInTheDocument();
    await userEvent.keyboard("{Meta>}j{/Meta}");
    await userEvent.keyboard("{Meta>}j{/Meta}");
    expect(feuille()).toBeNull();
  });

  it("Échap qui efface la saisie ne ferme PAS la console", async () => {
    render(<HubConsole actif="videos" />);
    await apresLeMontage();
    await userEvent.click(screen.getByRole("button", { name: "Console" }));
    const saisie = screen.getByRole("textbox");
    await userEvent.type(saisie, "un brouillon");
    await userEvent.keyboard("{Escape}");
    expect(saisie).toHaveValue("");
    expect(feuille()).toBeInTheDocument();
  });

  it("détachée en fenêtre flottante, la barre revient et l'onglet est enfoncé", async () => {
    render(<HubConsole actif="videos" />);
    await apresLeMontage();
    await userEvent.click(screen.getByRole("button", { name: "Console" }));
    await userEvent.click(screen.getByRole("button", { name: "Détacher en fenêtre flottante" }));
    expect(screen.getByRole("dialog", { name: "Console IA" })).toBeInTheDocument();
    expect(barre()).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Console" })).toHaveAttribute("aria-pressed", "true");

    // l'onglet referme la flottante
    await userEvent.click(screen.getByRole("button", { name: "Console" }));
    expect(screen.queryByRole("dialog", { name: "Console IA" })).toBeNull();
  });

  it("rouvre là où on l'avait laissée, y compris un mode écrit avant la barre du bas", async () => {
    localStorage.setItem("motion-hubconsole-mode", "drawer");
    render(<HubConsole actif="videos" />);
    await apresLeMontage();
    await waitFor(() => expect(feuille()).toBeInTheDocument());
    expect(barre()).toBeNull();
  });

  it("une fenêtre bloquée par le navigateur se rabat sur la console flottante, et le dit", async () => {
    const ouvrir = window.open;
    window.open = () => null;
    try {
      render(<HubConsole actif="videos" />);
      await apresLeMontage();
      await userEvent.click(screen.getByRole("button", { name: "Console" }));
      await userEvent.click(screen.getByRole("button", { name: "Ouvrir dans une fenêtre séparée" }));
      expect(screen.getByRole("dialog", { name: "Console IA" })).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent("fenêtre séparée indisponible");
    } finally {
      window.open = ouvrir;
    }
  });
});
