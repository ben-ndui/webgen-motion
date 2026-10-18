import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { serieSaya } from "../../../../../../../remotion/film/cinema/serie-exemple.test-utils";
import EpisodesAVenir from "./episodes-a-venir";

describe("EpisodesAVenir", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("ne rend rien quand il n'y a aucun brief en attente", () => {
    const { container } = render(<EpisodesAVenir cinema={serieSaya()} modifierLaSerie={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("liste les briefs, copie une note dans le presse-papier, retire un brief", async () => {
    const cinema = serieSaya();
    cinema.episodesAVenir = [
      { titre: "Le retour", note: "Henrik revient à Monaco." },
      { titre: "La trahison", note: "Astrid découvre le secret." },
    ];
    const ecrire = vi.fn();
    vi.stubGlobal("navigator", { clipboard: { writeText: ecrire } });
    const modifierLaSerie = vi.fn((changement: (c: typeof cinema) => void) => changement(cinema));
    render(<EpisodesAVenir cinema={cinema} modifierLaSerie={modifierLaSerie} />);

    expect(screen.getByText("Épisodes à venir (2)")).toBeInTheDocument();
    expect(screen.getByText("Le retour")).toBeInTheDocument();
    expect(screen.getByText("La trahison")).toBeInTheDocument();

    const [premier] = screen.getAllByRole("button", { name: "Copier le brief" });
    fireEvent.click(premier);
    expect(ecrire).toHaveBeenCalledWith("Henrik revient à Monaco.");
    expect(await screen.findByRole("button", { name: "Copié !" })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Retirer" })[0]);
    expect(cinema.episodesAVenir).toEqual([{ titre: "La trahison", note: "Astrid découvre le secret." }]);
  });

  it("un presse-papier indisponible le dit, sans planter", async () => {
    const cinema = serieSaya();
    cinema.episodesAVenir = [{ titre: "Le retour", note: "Henrik revient à Monaco." }];
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn(async () => Promise.reject(new Error("refusé"))) } });
    render(<EpisodesAVenir cinema={cinema} modifierLaSerie={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Copier le brief" }));
    expect(await screen.findByRole("button", { name: "Copie impossible" })).toBeInTheDocument();
    expect(screen.getByText("Sélectionne le texte ci-dessus à la main.")).toBeInTheDocument();
  });
});
