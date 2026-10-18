import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import RenduDeFormat from "./rendu-de-format";

const DECLINAISON = { nom: "Teaser-FR", libelle: "Teaser (réseaux)", langue: "fr", version: "court", rendu: null } as const;
const rien = () => {};

describe("un rendu de format terminé", () => {
  it("dit combien de temps il a pris, et son poids", () => {
    render(<RenduDeFormat declinaison={DECLINAISON} bloque={false} studio etat={{ type: "fait", url: "/v.mp4", octets: 12 * 1024 * 1024, duree: 151 }} occupe={false} onLancer={rien} onAnnuler={rien} />);
    expect(screen.getByText("Rendu en 2 min 31 · 12.0 Mo")).toBeInTheDocument();
  });

  it("en cours : le suivi par étapes, avec Annuler", () => {
    const etat = { type: "en-cours" as const, label: "Image 454 sur 810", frames: 454, total: 810, etape: "images" as const, restant: 80, debut: Date.now() };
    render(<RenduDeFormat declinaison={DECLINAISON} bloque={false} studio etat={etat} occupe onLancer={rien} onAnnuler={rien} />);
    expect(screen.getByRole("list", { name: "Étapes du rendu" })).toBeInTheDocument();
    expect(screen.getByText("encore ~1 min 20")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Annuler" })).toBeInTheDocument();
  });
});
