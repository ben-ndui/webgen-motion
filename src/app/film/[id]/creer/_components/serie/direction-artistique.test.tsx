import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { serieSaya } from "../../../../../../../remotion/film/cinema/serie-exemple.test-utils";
import DirectionArtistique from "./direction-artistique";

describe("DirectionArtistique", () => {
  it("photoréaliste par défaut, palette et negatif vides", () => {
    render(<DirectionArtistique cinema={serieSaya()} modifierLaSerie={vi.fn()} />);
    expect(screen.getByRole("combobox", { name: "Style visuel" })).toHaveValue("photorealiste");
    expect(screen.getByRole("textbox", { name: /Palette et son usage/ })).toHaveValue("");
    expect(screen.getByRole("textbox", { name: /À ne jamais montrer/ })).toHaveValue("");
  });

  it("choisir manga-anime écrit cinema.style", () => {
    const cinema = serieSaya();
    const modifierLaSerie = vi.fn((changement: (c: typeof cinema) => void) => changement(cinema));
    render(<DirectionArtistique cinema={cinema} modifierLaSerie={modifierLaSerie} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Style visuel" }), { target: { value: "manga-anime" } });
    expect(cinema.style).toBe("manga-anime");
  });

  it("une palette tapée s'écrit sur cinema.palette, effacée elle disparaît (pas une chaîne vide)", () => {
    const cinema = serieSaya();
    const modifierLaSerie = vi.fn((changement: (c: typeof cinema) => void) => changement(cinema));
    render(<DirectionArtistique cinema={cinema} modifierLaSerie={modifierLaSerie} />);
    const champ = screen.getByRole("textbox", { name: /Palette et son usage/ });
    fireEvent.change(champ, { target: { value: "Black for the city, blue for the night." } });
    expect(cinema.palette).toBe("Black for the city, blue for the night.");
    fireEvent.change(champ, { target: { value: "   " } });
    expect(cinema.palette).toBeUndefined();
  });

  it("un negatif tapé s'écrit sur cinema.negatif", () => {
    const cinema = serieSaya();
    const modifierLaSerie = vi.fn((changement: (c: typeof cinema) => void) => changement(cinema));
    render(<DirectionArtistique cinema={cinema} modifierLaSerie={modifierLaSerie} />);
    fireEvent.change(screen.getByRole("textbox", { name: /À ne jamais montrer/ }), { target: { value: "stereotyped accessories" } });
    expect(cinema.negatif).toBe("stereotyped accessories");
  });
});
