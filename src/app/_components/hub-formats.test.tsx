import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import HubFormats from "./hub-formats";

const FORMATS = [
  { nom: "explainer", libelle: "Explainer", pourQui: "Pour expliquer un sujet." },
  { nom: "karaoke", libelle: "Clip karaoké", pourQui: "Pour les artistes." },
];

describe("la section Formats du hub", () => {
  it("dit qu'il n'y a encore aucune vidéo, et propose d'en créer une", () => {
    render(<HubFormats projets={[]} formats={FORMATS} error={null} />);
    expect(screen.getByText("Aucune vidéo de format")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Nouvelle vidéo/ })).toBeInTheDocument();
  });

  it("dit une lecture ratée comme une erreur, jamais comme une liste vide", () => {
    render(<HubFormats projets={[]} formats={FORMATS} error="EACCES" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Impossible de lire le dossier des formats");
    expect(screen.queryByText("Aucune vidéo de format")).not.toBeInTheDocument();
  });

  it("une carte par projet, vers sa page, avec son format et son statut", () => {
    render(
      <HubFormats
        projets={[{ id: "wes-of-10-ans", libelle: "Clip karaoké", statut: "exemple", erreurs: 0, apercu: { video: null, portrait: false } }]}
        formats={FORMATS}
        error={null}
      />,
    );
    const carte = screen.getByRole("link", { name: /wes-of-10-ans/ });
    expect(carte).toHaveAttribute("href", "/format/wes-of-10-ans");
    expect(carte).toHaveTextContent("Clip karaoké");
    expect(carte).toHaveTextContent("Exemple");
  });
});
