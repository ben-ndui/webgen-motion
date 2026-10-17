"use client";

import type { DecorDuKaraoke } from "../../../../../../remotion/film/karaoke/spec";
import ChoixDeCases from "../../../../_components/choix-de-cases";

// Vignettes neutres (« Ton titre », « Ton nom ») dans public/formats/decors/ : jamais le morceau d'un artiste.
const DECORS: { valeur: DecorDuKaraoke; libelle: string; aide: string }[] = [
  { valeur: "horizon", libelle: "Horizon", aide: "Soleil rayé, grille qui avance" },
  { valeur: "ville", libelle: "Ville", aide: "Les fenêtres s'allument sur le temps" },
  { valeur: "ocean", libelle: "Océan", aide: "Lune et vagues" },
  { valeur: "vinyle", libelle: "Vinyle", aide: "Le disque tourne" },
  { valeur: "minimal", libelle: "Minimal", aide: "Tes paroles en très grand" },
];

/** Le décor du clip : dans tes couleurs, et il bat sur ton tempo. */
export default function ChoixDuDecor({ decor, onChange }: { decor: DecorDuKaraoke; onChange: (decor: DecorDuKaraoke) => void }) {
  return (
    <section className="bloc" aria-labelledby="bloc-decor" data-wm-id="format.karaoke.decor">
      <h3 id="bloc-decor" className="bloc-titre">Ton décor</h3>
      <p className="champ-aide">Il prend tes couleurs et bat sur ton tempo.</p>
      <ChoixDeCases titre="Décor" options={DECORS.map((d) => ({ ...d, image: `/formats/decors/${d.valeur}.jpg` }))} valeurs={[decor]}
        onChange={(valeurs) => onChange(valeurs[0] as DecorDuKaraoke)} />
    </section>
  );
}
