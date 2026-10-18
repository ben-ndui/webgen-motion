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
  apercu: { video: "/api/motion/film/video?id=kotizo&declinaison=Court-FR", portrait: true },
};

describe("HubFilms", () => {
  it("aucun film : dit comment en créer un", () => {
    render(<HubFilms films={[]} error={null} />);
    expect(screen.getByText("Aucun film de marque")).toBeInTheDocument();
    // Plus de bouton dans la section : la création vit dans le « + Nouveau » du dashboard.
    expect(screen.getByText(/« \+ Nouveau »/)).toBeInTheDocument();
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

  it("la carte montre l'image du premier rendu, dans un cadre de téléphone pour un film vertical", () => {
    const { container } = render(<HubFilms films={[FILM]} error={null} />);
    const video = container.querySelector("[data-wm-id='hub.film.card'] video");
    expect(video?.getAttribute("src")).toBe("/api/motion/film/video?id=kotizo&declinaison=Court-FR#t=12");
    expect(container.querySelector(".device.phone")).not.toBeNull();
  });

  it("sans rendu : le croquis, jamais une vidéo qui n'existe pas", () => {
    const { container } = render(<HubFilms films={[{ ...FILM, apercu: { video: null, portrait: false } }]} error={null} />);
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector(".device.mac [class='dev-body']")).not.toBeNull();
  });
});
