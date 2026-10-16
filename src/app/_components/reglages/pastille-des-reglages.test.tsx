import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { etatDesReglages } from "@/lib/reglages/etat-des-reglages";

import PastilleDesReglages from "./pastille-des-reglages";

const RIEN_DE_REGLE = etatDesReglages({ claude: false, video: false, voix: false });
const TOUT_REGLE = etatDesReglages({ claude: true, video: true, voix: true });
const SANS_LA_VIDEO = etatDesReglages({ claude: true, video: false, voix: true });

async function apresLeMontage() {
  await act(() => new Promise((fin) => requestAnimationFrame(() => fin(undefined))));
}

describe("Prépare ton studio", () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it("après une installation, s'ouvre tout seul et dit ce qui manque et où le régler", async () => {
    render(<PastilleDesReglages reglages={SANS_LA_VIDEO} />);
    await apresLeMontage();
    const fenetre = screen.getByRole("dialog", { name: "Prépare ton studio" });
    expect(fenetre).toHaveTextContent("Il te manque 1 réglage.");
    const video = within(fenetre).getByText("Vidéo IA (Google)").closest("li")!;
    expect(within(video).getByRole("link", { name: "Régler" })).toHaveAttribute("href", "/setup/video");
    expect(within(fenetre).getByText("Claude").closest("li")).toHaveTextContent("Prêt");
    expect(screen.getByRole("button", { name: "1 réglage à faire" })).toBeInTheDocument();
  });

  it("« Plus tard » la ferme, et elle ne revient pas avant le prochain lancement ; la pastille la rouvre", async () => {
    const { unmount } = render(<PastilleDesReglages reglages={RIEN_DE_REGLE} />);
    await apresLeMontage();
    fireEvent.click(screen.getByRole("button", { name: "Plus tard" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    unmount();

    // retour au tableau de bord dans le même lancement : pas de deuxième ouverture
    render(<PastilleDesReglages reglages={RIEN_DE_REGLE} />);
    await apresLeMontage();
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "3 réglages à faire" }));
    expect(screen.getByRole("dialog", { name: "Prépare ton studio" })).toBeInTheDocument();
  });

  it("Échap la ferme", async () => {
    render(<PastilleDesReglages reglages={RIEN_DE_REGLE} />);
    await apresLeMontage();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("tout est réglé : rien ne s'ouvre, la pastille dit « Prêt »", async () => {
    render(<PastilleDesReglages reglages={TOUT_REGLE} />);
    await apresLeMontage();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Prêt" })).toBeInTheDocument();
  });
});
