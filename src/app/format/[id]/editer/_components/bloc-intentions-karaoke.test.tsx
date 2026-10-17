import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { KaraokeSpec } from "../../../../../../remotion/film/karaoke/spec";
import { projetDeDepart } from "@/lib/formats/format-loader";
import BlocIntentionsKaraoke from "./bloc-intentions-karaoke";
import ChoixDuDecor from "./choix-du-decor";

const spec = () => (projetDeDepart("karaoke", "clip") as { spec: KaraokeSpec }).spec;

/** Rend le bloc et applique les changements à une copie, comme le ferait l'éditeur. */
function bloc(depart: KaraokeSpec) {
  let courante = depart;
  const modifier = vi.fn((changement: (s: KaraokeSpec) => KaraokeSpec | void) => {
    const copie = structuredClone(courante);
    courante = changement(copie) ?? copie;
    vue.rerender(<BlocIntentionsKaraoke spec={courante} modifier={modifier} />);
  });
  const vue = render(<BlocIntentionsKaraoke spec={courante} modifier={modifier} />);
  return { lire: () => courante };
}

describe("ce que veut l'artiste", () => {
  it("le clip complet et le teaser ont chacun leur passage", () => {
    bloc(spec());
    expect(screen.getByRole("spinbutton", { name: "Le clip : fin" })).toHaveValue(203.9);
    expect(screen.getByRole("spinbutton", { name: "Le teaser : début" })).toHaveValue(13);
  });

  it("décocher le teaser retire la vidéo verticale ; on ne peut pas tout décocher", async () => {
    const utilisateur = userEvent.setup();
    const { lire } = bloc(spec());
    await utilisateur.click(screen.getByRole("checkbox", { name: /Un teaser pour tes réseaux/ }));
    expect(lire().declinaisons.map((d) => d.version)).toEqual(["long"]);
    expect(screen.getByRole("checkbox", { name: /Le clip complet/ })).toBeDisabled();
  });

  it("cocher le teaser lui donne un passage de départ de 30 s au plus", async () => {
    const utilisateur = userEvent.setup();
    const depart = spec();
    depart.declinaisons = depart.declinaisons.filter((d) => d.version === "long");
    delete depart.morceau.teaser;
    const { lire } = bloc(depart);
    await utilisateur.click(screen.getByRole("checkbox", { name: /Un teaser pour tes réseaux/ }));
    const { teaser } = lire().morceau;
    expect(teaser && teaser.fin - teaser.debut).toBeLessThanOrEqual(30);
    expect(lire().declinaisons.map((d) => d.nom)).toEqual(["Karaoke-FR", "Karaoke-Court-FR"]);
  });
});

describe("le choix du décor", () => {
  it("propose les cinq décors, chacun avec sa vignette neutre", () => {
    const { container } = render(<ChoixDuDecor decor="horizon" onChange={() => {}} />);
    const vignettes = [...container.querySelectorAll("img")].map((img) => img.getAttribute("src"));
    expect(vignettes).toEqual(["horizon", "ville", "ocean", "vinyle", "minimal"].map((d) => `/formats/decors/${d}.jpg`));
  });
});
