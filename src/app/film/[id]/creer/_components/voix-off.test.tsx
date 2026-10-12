import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ficheDeDepart } from "@/lib/film-fiche-depart";
import VoixOff from "./voix-off";

function ficheAvecVoix() {
  const fiche = ficheDeDepart({ nom: "Saya", langues: ["fr"], formats: ["court"], direction: "nocturne" });
  fiche.voix = { musiqueSousLaVoix: 0.15, lignes: { fr: [{ repere: "ouverture.nom", texte: "Saya", fichier: "voix/fr/a.mp3", duree: 1 }], en: [] } };
  return fiche;
}

describe("voix off : le genre de la voix", () => {
  it("masculine par défaut ; passer en féminine refait toutes les répliques", () => {
    const fiche = ficheAvecVoix();
    const modifier = vi.fn();
    render(<VoixOff id="saya" fiche={fiche} langues={["fr"]} modifier={modifier} enregistrer={async () => true} recharger={async () => {}} />);
    expect(screen.getByRole("radio", { name: /Voix masculine/ })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: /Voix féminine/ }));
    const copie = structuredClone(fiche);
    modifier.mock.calls.at(-1)![0](copie);
    expect(copie.voix?.genre).toBe("feminin");
    expect(copie.voix?.lignes.fr[0]?.fichier).toBeUndefined();
  });
});
