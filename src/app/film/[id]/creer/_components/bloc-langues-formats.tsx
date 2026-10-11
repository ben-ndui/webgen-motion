"use client";

import { changerLesDeclinaisons, formatsDuFilm, languesDuFilm } from "@/lib/film-fiche-depart";
import type { MediaDeLEditeur } from "@/lib/film-editeur";
import ChoixDeCases from "../../../../_components/choix-de-cases";
import { FORMATS_DU_FILM, LANGUES_DU_FILM } from "../../../../_components/choix-du-film";
import type { FilmSpec, Langue, VersionDuFilm } from "../../../../../../remotion/film/spec";

type Props = {
  fiche: FilmSpec;
  medias: MediaDeLEditeur[];
  modifier: (changement: (copie: FilmSpec) => void) => void;
};

/**
 * Les langues et les formats du film, modifiables après la création. Ajouter
 * une langue ajoute ses captures et ses textes à fournir : on le dit tout de
 * suite, plutôt que de le laisser découvrir à l'étape « C'est prêt ? ».
 */
export default function BlocLanguesFormats({ fiche, medias, modifier }: Props) {
  const langues = languesDuFilm(fiche);
  const formats = formatsDuFilm(fiche);
  const capturesManquantes = (langue: Langue) => medias.filter((m) => m.role === "capture" && !m.present && m.langues.includes(langue)).length;
  const aCompleter = langues.filter((langue) => capturesManquantes(langue) > 0 && langues.length > 1);

  return (
    <section className="bloc" aria-labelledby="bloc-langues-formats">
      <h3 id="bloc-langues-formats" className="bloc-titre">Langues et formats</h3>
      <p className="champ-aide">Une vidéo est rendue pour chaque langue et chaque format choisis.</p>
      <ChoixDeCases
        titre="Langues"
        multiple
        options={LANGUES_DU_FILM}
        valeurs={langues}
        onChange={(valeurs) => modifier((c) => changerLesDeclinaisons(c, valeurs as Langue[], formatsDuFilm(c)))}
      />
      <ChoixDeCases
        titre="Formats"
        multiple
        options={FORMATS_DU_FILM}
        valeurs={formats}
        onChange={(valeurs) => modifier((c) => changerLesDeclinaisons(c, languesDuFilm(c), valeurs as VersionDuFilm[]))}
      />
      {aCompleter.map((langue) => (
        <p key={langue} className="champ-aide">
          En {langue === "fr" ? "français" : "anglais"} : {capturesManquantes(langue)} capture{capturesManquantes(langue) > 1 ? "s" : ""} et les
          textes à fournir (étapes « Tes écrans » et « Ton histoire »), ou relance « Remplir depuis ton site ».
        </p>
      ))}
    </section>
  );
}
