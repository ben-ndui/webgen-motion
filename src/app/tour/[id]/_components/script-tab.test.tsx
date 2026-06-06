import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { TourEntry } from "@/lib/types/tour";
import ScriptTab from "./script-tab";

function makeTour(): TourEntry {
  return {
    id: "t",
    name: "Test",
    description: "",
    estimatedSec: 10,
    startPath: "/",
    steps: [
      { type: "section", categoryId: "branding", title: "Hero", dwellMs: 2200 },
      { type: "wait", dwellMs: 1200 },
    ],
  } as TourEntry;
}

describe("ScriptTab (handoff layout)", () => {
  it("renders step rows with type badges + summary + side resume", () => {
    render(
      <ScriptTab tour={makeTour()} onChange={() => {}} captureFormat="16:9" onFormatChange={() => {}} />,
    );
    expect(screen.getByText("Hero")).toBeInTheDocument();
    expect(screen.getByText("Pause · aucune voix")).toBeInTheDocument();
    // résumé
    expect(screen.getByText("Étapes")).toBeInTheDocument();
    // type legend has the 5 add types as badges (Section appears in legend + row)
    expect(screen.getAllByText("Section").length).toBeGreaterThanOrEqual(1);
  });

  it("edits a step VO through onChange", async () => {
    const onChange = vi.fn();
    render(
      <ScriptTab tour={makeTour()} onChange={onChange} captureFormat="16:9" onFormatChange={() => {}} />,
    );
    const vo = screen.getByPlaceholderText(/Texte de la voix off/i);
    await userEvent.type(vo, "x");
    expect(onChange).toHaveBeenCalled();
    const next = onChange.mock.calls.at(-1)![0] as TourEntry;
    expect(next.steps[0]).toMatchObject({ voiceover: "x" });
  });

  it("adds a step via the type picker", async () => {
    const onChange = vi.fn();
    render(
      <ScriptTab tour={makeTour()} onChange={onChange} captureFormat="16:9" onFormatChange={() => {}} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Ajouter une étape/i }));
    // the add-menu lists type options as buttons; the legend uses spans
    await userEvent.click(screen.getByRole("button", { name: /Overlay/ }));
    expect(onChange).toHaveBeenCalled();
    const next = onChange.mock.calls.at(-1)![0] as TourEntry;
    expect(next.steps).toHaveLength(3);
    expect(next.steps[2].type).toBe("overlay");
  });

  it("deletes a step (after confirm)", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const onChange = vi.fn();
    render(
      <ScriptTab tour={makeTour()} onChange={onChange} captureFormat="16:9" onFormatChange={() => {}} />,
    );
    const dels = screen.getAllByRole("button", { name: "Supprimer" });
    await userEvent.click(dels[0]);
    const next = onChange.mock.calls.at(-1)![0] as TourEntry;
    expect(next.steps).toHaveLength(1);
  });

  it("switches capture format", async () => {
    const onFormatChange = vi.fn();
    render(
      <ScriptTab tour={makeTour()} onChange={() => {}} captureFormat="16:9" onFormatChange={onFormatChange} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /9:16/ }));
    expect(onFormatChange).toHaveBeenCalledWith("9:16");
  });
});
