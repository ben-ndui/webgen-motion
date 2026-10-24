import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HubApp, { type HubTour } from "./hub-app";

const TOURS: HubTour[] = [
  { id: "a", name: "Onboarding SaaS", fmt: "16:9", steps: 12, dur: "1:40", cat: "Produit", status: "ready" },
  { id: "b", name: "App mobile teaser", fmt: "9:16", steps: 8, dur: "0:45", cat: "Social", status: "draft" },
  { id: "c", name: "API Docs quickstart", fmt: "16:9", steps: 14, dur: "2:05", cat: "Docs", status: "rendered" },
];

describe("HubApp", () => {
  it("renders shell + all tours with the live count", () => {
    render(<HubApp tours={TOURS} edition="studio" />);
    expect(screen.getByText("GEN MOTION")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Studio" })).toHaveAttribute("href", "/setup/license");
    expect(screen.getByText("Onboarding SaaS")).toBeInTheDocument();
    expect(screen.getByText("App mobile teaser")).toBeInTheDocument();
    expect(screen.getByText("API Docs quickstart")).toBeInTheDocument();
  });

  it("navigation de la maison : une barre flottante en bas, aucune barre latérale", () => {
    const { container } = render(<HubApp tours={TOURS} edition="community" />);
    const barre = screen.getByRole("navigation", { name: "Navigation du studio" });
    expect(barre).toHaveClass("barre-flottante");
    expect(screen.getByRole("link", { name: "Mes vidéos" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Réglages" })).toHaveAttribute("href", "/setup");
    expect(screen.getByRole("link", { name: "Aide" })).toHaveAttribute("href", "/help");
    expect(container.querySelector("aside")).toBeNull();
    expect(screen.getByRole("link", { name: "Community" })).toBeInTheDocument();
  });

  it("filters by format", async () => {
    render(<HubApp tours={TOURS} edition="community" />);
    await userEvent.click(screen.getByRole("button", { name: "9:16" }));
    expect(screen.getByText("App mobile teaser")).toBeInTheDocument();
    expect(screen.queryByText("Onboarding SaaS")).not.toBeInTheDocument();
    expect(screen.queryByText("API Docs quickstart")).not.toBeInTheDocument();
  });

  it("filters by search query (name or category)", async () => {
    render(<HubApp tours={TOURS} edition="studio" />);
    await userEvent.type(screen.getByPlaceholderText(/Rechercher/i), "docs");
    expect(screen.getByText("API Docs quickstart")).toBeInTheDocument();
    expect(screen.queryByText("Onboarding SaaS")).not.toBeInTheDocument();
  });

  it("shows the empty state when nothing matches", async () => {
    render(<HubApp tours={TOURS} edition="studio" />);
    await userEvent.type(screen.getByPlaceholderText(/Rechercher/i), "zzzzz");
    expect(screen.getByText(/Aucun tour ne correspond/i)).toBeInTheDocument();
  });

  it("community edition shows the Community license badge", () => {
    render(<HubApp tours={TOURS} edition="community" />);
    expect(screen.getByText("Community")).toBeInTheDocument();
  });

  it("links each card to its editor route", () => {
    const { container } = render(<HubApp tours={TOURS} edition="studio" />);
    const links = Array.from(container.querySelectorAll('a[data-wm-id="hub.card"]'));
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveAttribute("href", "/tour/a");
  });

  it("un seul bouton « + Nouveau » ouvre toute la création (tour, film, format)", async () => {
    render(<HubApp tours={TOURS} edition="studio" />);
    // Un seul déclencheur visible — plus de boutons « Nouveau film » / « Nouvelle vidéo » séparés.
    expect(screen.queryAllByRole("button", { name: /^\+? ?Nouveau/ })).toHaveLength(1);
    const declencheur = screen.getByRole("button", { name: /Nouveau/ });
    expect(declencheur).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(declencheur);
    expect(declencheur).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: /Nouveau tour/ })).toHaveAttribute("href", "/nouveau/tour");
    expect(screen.getByRole("link", { name: /Nouveau film/ })).toHaveAttribute("href", "/nouveau/film");
    expect(screen.getByRole("link", { name: /Nouveau format/ })).toHaveAttribute("href", "/nouveau/format");
  });

  it("Échap referme le menu « + Nouveau »", async () => {
    render(<HubApp tours={TOURS} edition="studio" />);
    const declencheur = screen.getByRole("button", { name: /Nouveau/ });
    await userEvent.click(declencheur);
    expect(declencheur).toHaveAttribute("aria-expanded", "true");
    await userEvent.keyboard("{Escape}");
    expect(declencheur).toHaveAttribute("aria-expanded", "false");
  });
});

describe("HubApp — profil « série » (réglage /setup/interface)", () => {
  it("masque les tours (titre, recherche, filtres, grille)", () => {
    render(<HubApp tours={TOURS} edition="studio" profilSerie />);
    expect(screen.queryByText("Onboarding SaaS")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Rechercher/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: "Format" })).not.toBeInTheDocument();
    expect(screen.queryByText(/^Tours/)).not.toBeInTheDocument();
  });

  it("« + Nouveau » devient un lien direct vers Nouvelle série, sans menu déroulant", () => {
    render(<HubApp tours={TOURS} edition="studio" profilSerie />);
    expect(screen.queryByRole("button", { name: /Nouveau/ })).not.toBeInTheDocument();
    const lien = screen.getByRole("link", { name: /Nouvelle série/ });
    expect(lien).toHaveAttribute("href", "/nouveau/serie");
  });

  it("le reste du hub (marque, réglages, licence) n'est pas affecté", () => {
    render(<HubApp tours={TOURS} edition="community" profilSerie films={[]} />);
    expect(screen.getByText("GEN MOTION")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Community" })).toBeInTheDocument();
  });
});
