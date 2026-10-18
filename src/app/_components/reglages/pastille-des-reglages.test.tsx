import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { etatDesReglages } from "@/lib/reglages/etat-des-reglages";

import PastilleDesReglages from "./pastille-des-reglages";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const RIEN_DE_REGLE = etatDesReglages({ claude: false, video: false, voix: false, paroles: false, karaoke: false });
const TOUT_REGLE = etatDesReglages({ claude: true, video: true, voix: true, paroles: true, karaoke: true });
const SANS_LA_VIDEO = etatDesReglages({ claude: true, video: false, voix: true, paroles: true, karaoke: true });

async function apresLeMontage() {
  await act(() => new Promise((fin) => requestAnimationFrame(() => fin(undefined))));
}

describe("Prépare ton studio", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });
  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

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

  it("le calage mot à mot s'installe DEPUIS la fenêtre : maintenant, ou « Plus tard »", async () => {
    render(<PastilleDesReglages reglages={etatDesReglages({ claude: true, video: true, voix: true, paroles: true, karaoke: false })} />);
    await apresLeMontage();
    const fenetre = screen.getByRole("dialog", { name: "Prépare ton studio" });
    const karaoke = within(fenetre).getByText("Calage mot à mot (karaoké)").closest("li")!;
    expect(within(karaoke).getByRole("button", { name: "Installer maintenant" })).toBeInTheDocument();
    expect(within(karaoke).queryByRole("link")).not.toBeInTheDocument();
    expect(within(fenetre).getByRole("button", { name: "Plus tard" })).toBeInTheDocument();
  });

  it("seul le calage mot à mot manque : proposé UNE fois pour toujours, la pastille dit « Prêt »", async () => {
    const SEUL_LE_KARAOKE = etatDesReglages({ claude: true, video: true, voix: true, paroles: true, karaoke: false });
    const premier = render(<PastilleDesReglages reglages={SEUL_LE_KARAOKE} />);
    await apresLeMontage();
    expect(screen.getByRole("dialog", { name: "Prépare ton studio" })).toHaveTextContent("Tout est réglé.");
    expect(screen.getByRole("button", { name: "Prêt" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Plus tard" }));
    premier.unmount();

    // un AUTRE lancement (session neuve) : la proposition ne revient pas
    sessionStorage.clear();
    render(<PastilleDesReglages reglages={SEUL_LE_KARAOKE} />);
    await apresLeMontage();
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Prêt" }));
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Installer maintenant" })).toBeInTheDocument();
  });

  it("sur une machine où il ne peut pas tourner, rien ne le propose", async () => {
    render(<PastilleDesReglages reglages={etatDesReglages({ claude: true, video: true, voix: true, paroles: true, karaoke: null })} />);
    await apresLeMontage();
    expect(screen.queryByRole("dialog")).toBeNull();
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
    fireEvent.click(screen.getByRole("button", { name: "4 réglages à faire" }));
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
