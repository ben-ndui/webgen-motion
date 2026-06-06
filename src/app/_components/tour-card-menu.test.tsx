import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TourCardMenu from "./tour-card-menu";

describe("TourCardMenu (quick actions)", () => {
  it("opens the menu and the delete confirm", async () => {
    render(<TourCardMenu tourId="pitch" tourName="Mon Tour" />);
    // menu closed initially
    expect(screen.queryByText("Supprimer")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Actions du tour/i }));
    const del = screen.getByText("Supprimer");
    expect(del).toBeInTheDocument();

    await userEvent.click(del);
    expect(screen.getByRole("heading", { name: /Supprimer le tour/i })).toBeInTheDocument();
    expect(screen.getByText("Mon Tour")).toBeInTheDocument();
  });
});
