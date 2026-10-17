import { fireEvent, render, screen } from "@testing-library/react";
import { useRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FicheVisuelle } from "@/lib/cinema/bible/etat";
import { EXEMPLES_DE_SERIE } from "../../../../../../../remotion/film/cinema/exemples";
import { serieSaya } from "../../../../../../../remotion/film/cinema/serie-exemple.test-utils";
import type { CinemaDuFilm } from "../../../../../../../remotion/film/cinema/types";
import CarteDeReference from "./carte-de-reference";

/** Comme use-bible.ts + modifierLaSerie : la copie change, la carte se relit dessus. */
function Banc({ depart, fiche }: { depart: CinemaDuFilm; fiche?: FicheVisuelle }) {
  const derniere = useRef(depart);
  const [cinema, setCinema] = useState(depart);
  const modifierLaSerie = (changement: (c: CinemaDuFilm) => void) => {
    const copie = structuredClone(derniere.current);
    changement(copie);
    derniere.current = copie;
    setCinema(copie);
  };
  const personnage = cinema.personnages[0];
  return (
    <CarteDeReference
      filmId="saya"
      cinema={cinema}
      id={personnage.id}
      type="personnage"
      nom={personnage.nom}
      description={personnage.description}
      fiche={fiche}
      etats={{}}
      modifierLesTextes={(nom, description) =>
        modifierLaSerie((c) => {
          c.personnages[0].nom = nom;
          c.personnages[0].description = description;
        })
      }
      modifierLaSerie={modifierLaSerie}
      onGenerer={() => {}}
      onImporter={() => {}}
      onRetenir={() => {}}
      onChoisirPrincipale={() => {}}
      onValider={() => {}}
      onDeverrouiller={() => {}}
      onRetirer={() => {}}
    />
  );
}

function repondre(statut: number, corps: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(corps), { status: statut }));
}

describe("CarteDeReference — « Décrire avec Claude »", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("propose de décrire tant que la description est l'exemple, puis de réécrire une fois la proposition gardée", async () => {
    const depart = serieSaya();
    depart.personnages[0].description = EXEMPLES_DE_SERIE.description;
    const proposition = { type: "decrire-reference", reference: "awa", description: "A tall woman with a confident smile." };
    vi.stubGlobal("fetch", repondre(200, { proposition }));
    render(<Banc depart={depart} />);

    expect(screen.getByRole("button", { name: "Décrire avec Claude" })).toBeInTheDocument();
    expect(screen.getByText("Décris-le d'abord : les vues se génèrent à partir de la description.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Décrire avec Claude" }));
    await screen.findByRole("region", { name: "Proposition de Claude" });
    fireEvent.click(screen.getByRole("button", { name: "Garder" }));

    expect(await screen.findByDisplayValue("A tall woman with a confident smile.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Réécrire avec Claude" })).toBeInTheDocument();
    // Les vues apparaissent maintenant que la description n'est plus l'exemple.
    expect(screen.queryByText("Décris-le d'abord : les vues se génèrent à partir de la description.")).toBeNull();
  });

  it("n'offre plus de la réécrire une fois la référence verrouillée : c'est ce texte-là qui part avec l'image validée", () => {
    render(<Banc depart={serieSaya()} fiche={{ statut: "valide", vues: {}, journal: [] }} />);
    expect(screen.queryByRole("button", { name: "Réécrire avec Claude" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Décrire avec Claude" })).toBeNull();
  });
});
