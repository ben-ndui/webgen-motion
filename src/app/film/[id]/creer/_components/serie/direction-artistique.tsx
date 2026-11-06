"use client";

import { LONGUEUR_MAX_DE_LA_PALETTE, LONGUEUR_MAX_DU_NEGATIF } from "../../../../../../../remotion/film/cinema/validerCinema";
import { STYLES_VISUELS, type CinemaDuFilm, type StyleVisuel } from "../../../../../../../remotion/film/cinema/types";

type Props = {
  cinema: CinemaDuFilm;
  modifierLaSerie: (changement: (cinema: CinemaDuFilm) => void) => void;
};

const LIBELLE_DU_STYLE: Record<StyleVisuel, string> = {
  photorealiste: "Photoréaliste",
  "cinema-fantasy": "Fantasy cinématographique",
  "animation-3d": "Animation 3D",
  illustration: "Illustration peinte",
  "manga-anime": "Manga / anime",
};

/**
 * Le rendu de la série : quel style dessine les images et les plans, sa
 * palette (remplace celle de la marque quand décrite) et ce qu'elle interdit
 * de montrer. S'applique à TOUTE la série, importé depuis une bible ou réglé
 * à la main — les deux écrivent les mêmes trois champs.
 */
export default function DirectionArtistique({ cinema, modifierLaSerie }: Props) {
  return (
    <section className="bloc" aria-label="La direction artistique">
      <h3 className="bloc-titre">Le rendu de la série</h3>
      <label className="champ">
        <span className="champ-question">Style visuel</span>
        <select
          className="champ-saisie"
          value={cinema.style ?? "photorealiste"}
          onChange={(e) => modifierLaSerie((c) => void (c.style = e.target.value as StyleVisuel))}
        >
          {STYLES_VISUELS.map((style) => (
            <option key={style} value={style}>
              {LIBELLE_DU_STYLE[style]}
            </option>
          ))}
        </select>
      </label>

      <label className="champ">
        <span className="champ-question">Palette et son usage (facultatif)</span>
        <span className="champ-aide">En anglais, quelle couleur pour quel usage. Remplace la palette de marque dans cette série.</span>
        <textarea
          className="champ-saisie zone"
          rows={2}
          maxLength={LONGUEUR_MAX_DE_LA_PALETTE}
          placeholder="Black and anthracite for clothes and the city, deep blue for night scenes, warm orange for the face and hope."
          value={cinema.palette ?? ""}
          onChange={(e) =>
            modifierLaSerie((c) => {
              if (e.target.value.trim() !== "") c.palette = e.target.value;
              else delete c.palette;
            })
          }
        />
      </label>

      <label className="champ">
        <span className="champ-question">À ne jamais montrer (facultatif)</span>
        <span className="champ-aide">En anglais, en plus de l&apos;interdit commun (texte, logo, mains difformes…).</span>
        <textarea
          className="champ-saisie zone"
          rows={2}
          maxLength={LONGUEUR_MAX_DU_NEGATIF}
          placeholder="Traditional costume, flag worn as a cape, stereotyped accessories."
          value={cinema.negatif ?? ""}
          onChange={(e) =>
            modifierLaSerie((c) => {
              if (e.target.value.trim() !== "") c.negatif = e.target.value;
              else delete c.negatif;
            })
          }
        />
      </label>
    </section>
  );
}
