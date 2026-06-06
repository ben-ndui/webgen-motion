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
    expect(screen.getByText("Studio Edition")).toBeInTheDocument();
    expect(screen.getByText("Onboarding SaaS")).toBeInTheDocument();
    expect(screen.getByText("App mobile teaser")).toBeInTheDocument();
    expect(screen.getByText("API Docs quickstart")).toBeInTheDocument();
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
});
