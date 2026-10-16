"use client";

import { changerLesDeclinaisons, languesDesDeclinaisons, versionsDesDeclinaisons } from "@/lib/formats/declinaisons";
import type { NomDeFormat } from "@/lib/formats/catalogue";
import type { DeclinaisonDuFilm, Langue, VersionDuFilm } from "../../../../../../remotion/film/spec";
import ChoixDeCases from "../../../../_components/choix-de-cases";
import { FORMATS_DU_FILM, LANGUES_DU_FILM } from "../../../../_components/choix-du-film";

type Props = {
  format: NomDeFormat;
  declinaisons: DeclinaisonDuFilm[];
  modifier: (declinaisons: DeclinaisonDuFilm[]) => void;
};

/** Les langues et les formats rendus : une vidéo par langue et par format choisis. */
export default function BlocDeclinaisons({ format, declinaisons, modifier }: Props) {
  const langues = languesDesDeclinaisons(declinaisons);
  const versions = versionsDesDeclinaisons(declinaisons);
  return (
    <section className="bloc" aria-labelledby="bloc-declinaisons">
      <h3 id="bloc-declinaisons" className="bloc-titre">Langues et formats</h3>
      <p className="champ-aide">Une vidéo est rendue pour chaque langue et chaque format choisis.</p>
      <ChoixDeCases titre="Langues" multiple options={LANGUES_DU_FILM} valeurs={langues}
        onChange={(v) => modifier(changerLesDeclinaisons(format, declinaisons, v as Langue[], versions))} />
      <ChoixDeCases titre="Formats" multiple options={FORMATS_DU_FILM} valeurs={versions}
        onChange={(v) => modifier(changerLesDeclinaisons(format, declinaisons, langues, v as VersionDuFilm[]))} />
    </section>
  );
}
