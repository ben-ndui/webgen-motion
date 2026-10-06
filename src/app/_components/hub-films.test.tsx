import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import HubFilms, { type HubFilm } from "./hub-films";

const FILM: HubFilm = {
  id: "kotizo",
  nom: "kotizo",
  statut: "rendu",
  langues: ["fr", "en"],
  declinaisons: 4,
  rendus: 2,
  erreurs: 0,
};

describe("HubFilms", () => {
  it("aucun film : dit comment en créer un", () => {
    render(<HubFilms films={[]} error={null} />);
    expect(screen.getByText("Aucun film de marque")).toBeInTheDocument();
    expect(screen.getByText("films/<id>.json")).toBeInTheDocument();
  });

  it("dossier illisible : une erreur, pas « aucun film »", () => {
    render(<HubFilms films={[]} error="EACCES: permission denied" />);
    expect(screen.getByRole("alert")).toHaveTextContent("EACCES: permission denied");
    expect(screen.queryByText("Aucun film de marque")).not.toBeInTheDocument();
  });

  it("liste les films avec leur statut tiré du disque et un lien vers leur page", () => {
    const { container } = render(
      <HubFilms films={[FILM, { ...FILM, id: "faux", nom: "faux", statut: "brouillon", erreurs: 3, langues: [] }]} error={null} />,
    );
    expect(screen.getByText("Rendu")).toBeInTheDocument();
    expect(screen.getByText("2/4 rendus")).toBeInTheDocument();
    expect(screen.getByText("fiche invalide · 3 erreurs")).toBeInTheDocument();
    const liens = container.querySelectorAll('a[data-wm-id="hub.film.card"]');
    expect(liens[0]).toHaveAttribute("href", "/film/kotizo");
  });
});
