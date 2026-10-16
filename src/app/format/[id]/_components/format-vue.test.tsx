import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import type { ResumeDuProjet } from "@/lib/formats/format-etat";
import FormatVue from "./format-vue";

function resume(surcharge: Partial<ResumeDuProjet> = {}): ResumeDuProjet {
  return {
    id: "wes-of-10-ans",
    format: "karaoke",
    libelle: "Clip karaoké",
    statut: "pret",
    erreurs: [],
    medias: [
      { relatif: "musique/10-ans.mp3", present: true },
      { relatif: "karaoke/paroles.json", present: true },
    ],
    declinaisons: [{ nom: "Karaoke-FR", langue: "fr", version: "long", rendu: null }],
    ...surcharge,
  };
}

const POUR_QUI = "Pour les artistes : les paroles s'allument au moment où on les chante.";

describe("la page d'un projet de format", () => {
  it("dit qu'un projet est introuvable, sans afficher de rendu", () => {
    render(<FormatVue id="absent" resume={null} pourQui={null} studio />);
    expect(screen.getByRole("heading", { name: "Projet introuvable" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Rendre" })).not.toBeInTheDocument();
  });

  it("liste toutes les erreurs d'un projet invalide", () => {
    render(<FormatVue id="casse" resume={resume({ statut: "invalide", erreurs: ["sujet : minuscules", "decor : « horizon »"] })} pourQui={POUR_QUI} studio />);
    expect(screen.getByRole("alert")).toHaveTextContent("2 erreurs");
    expect(screen.getByText("decor : « horizon »")).toBeInTheDocument();
  });

  it("ne propose pas un rendu qui ne peut pas aboutir : contenu d'exemple", () => {
    render(<FormatVue id="wes-of-10-ans" resume={resume({ statut: "exemple" })} pourQui={POUR_QUI} studio />);
    expect(screen.getByRole("note")).toHaveTextContent("exemple du format");
    expect(screen.getByRole("button", { name: "Rendre" })).toBeDisabled();
  });

  it("dit chaque fichier à déposer, et bloque le rendu tant qu'il en manque", () => {
    render(
      <FormatVue id="wes-of-10-ans" resume={resume({ statut: "medias-manquants", medias: [{ relatif: "musique/10-ans.mp3", present: false }] })} pourQui={POUR_QUI} studio />,
    );
    expect(screen.getByText("musique/10-ans.mp3").parentElement).toHaveTextContent("à déposer");
    expect(screen.getByRole("button", { name: "Rendre" })).toBeDisabled();
    expect(screen.getByText("Déposer ton morceau")).toBeInTheDocument();
  });

  it("prêt : le rendu se lance en Studio, pas en Community", () => {
    const { rerender } = render(<FormatVue id="wes-of-10-ans" resume={resume()} pourQui={POUR_QUI} studio />);
    expect(screen.getByRole("button", { name: "Rendre" })).toBeEnabled();
    rerender(<FormatVue id="wes-of-10-ans" resume={resume()} pourQui={POUR_QUI} studio={false} />);
    expect(screen.getByRole("button", { name: "Rendre" })).toBeDisabled();
    expect(screen.getByText("Le rendu des formats est une fonction Studio.")).toBeInTheDocument();
  });

  it("un rendu sur le disque se montre dans son lecteur, avec son poids", () => {
    const rendu = { url: "/api/motion/formats/video?id=wes-of-10-ans&declinaison=Karaoke-FR&t=1", octets: 20 * 1024 * 1024 };
    const { container } = render(
      <FormatVue id="wes-of-10-ans" resume={resume({ statut: "rendu", declinaisons: [{ nom: "Karaoke-FR", langue: "fr", version: "long", rendu }] })} pourQui={POUR_QUI} studio />,
    );
    expect(container.querySelector("video")?.getAttribute("src")).toBe(rendu.url);
    expect(screen.getByText("20.0 Mo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rendre à nouveau" })).toBeEnabled();
  });
});
