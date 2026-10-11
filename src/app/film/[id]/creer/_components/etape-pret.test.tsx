import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ficheDeDepart } from "@/lib/film-fiche-depart";
import type { EtatDeLEditeur } from "@/lib/film-editeur";
import EtapePret from "./etape-pret";

const fiche = ficheDeDepart({ nom: "Saya", langues: ["fr"], formats: ["court"], direction: "nocturne" });

function etat(partiel: Partial<EtatDeLEditeur>): EtatDeLEditeur {
  return { id: "saya", fiche, valide: true, erreurs: [], medias: [], textesAEcrire: [], ...partiel };
}

describe("étape « C'est prêt ? »", () => {
  it("dit ce qui reste en clair et mène à la bonne étape, sans proposer « prêt »", () => {
    const onAller = vi.fn();
    render(
      <EtapePret
        id="saya"
        fiche={fiche}
        etat={etat({
          textesAEcrire: [{ langue: "fr", champ: "bascule.chiffre" }],
          medias: [{ role: "capture", relatif: "ecrans-fr/evenement-2.png", present: false, langues: ["fr"] }],
        })}
        modifier={() => {}}
        enregistrer={async () => true}
        onAller={onAller}
      />,
    );
    expect(screen.getByText("Il reste 2 choses à faire")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Le moment clé : Moment 2"));
    expect(onAller).toHaveBeenLastCalledWith("ecrans");
    fireEvent.click(screen.getByText("La bascule : le chiffre"));
    expect(onAller).toHaveBeenLastCalledWith("histoire");
    expect(screen.queryByRole("button", { name: "Mon film est prêt" })).not.toBeInTheDocument();
  });

  it("quand il ne reste rien, « Mon film est prêt » lève l'exemple et enregistre", async () => {
    const modifier = vi.fn();
    const enregistrer = vi.fn(async () => true);
    render(<EtapePret id="saya" fiche={fiche} etat={etat({})} modifier={modifier} enregistrer={enregistrer} onAller={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Mon film est prêt" }));
    const copie = structuredClone(fiche);
    modifier.mock.calls[0]![0](copie);
    expect(copie.exemple).toBe(false);
    await vi.waitFor(() => expect(enregistrer).toHaveBeenCalled());
  });

  it("un film prêt mène au rendu", () => {
    render(<EtapePret id="saya" fiche={{ ...fiche, exemple: false }} etat={etat({})} modifier={() => {}} enregistrer={async () => true} onAller={() => {}} />);
    expect(screen.getByRole("link", { name: "Aller au rendu" })).toHaveAttribute("href", "/film/saya");
  });
});
