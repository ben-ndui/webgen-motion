"use client";

import type { Budget } from "@/lib/cinema/generation";
import type { CinemaDuFilm } from "../../../../../../../remotion/film/cinema/types";
import { BUDGET_MAX, BUDGET_PAR_DEFAUT } from "../../../../../../../remotion/film/cinema/validerCinema";
import PhotoDuProduit from "./photo-du-produit";

type Props = {
  filmId: string;
  cinema: CinemaDuFilm;
  enregistrer: () => Promise<boolean>;
  // null tant que le serveur n'a répondu pour aucun plan.
  budget: Budget | null;
  modifierLaSerie: (changement: (cinema: CinemaDuFilm) => void) => void;
};

/**
 * L'objet du film (le produit, décrit une fois) et le budget : combien de
 * plans on s'autorise à payer pour ce film. L'objet imaginé passe la vidéo en
 * « APERÇU » tant que la photo du vrai produit ne le remplace pas.
 */
export default function ObjetEtBudget({ filmId, cinema, enregistrer, budget, modifierLaSerie }: Props) {
  const plafond = cinema.budget ?? BUDGET_PAR_DEFAUT;

  return (
    <section className="bloc" aria-label="L'objet et le budget">
      <h3 className="bloc-titre">L&apos;objet du film</h3>
      <label className="champ">
        <span className="champ-question">Le produit, s&apos;il apparaît (facultatif)</span>
        <span className="champ-aide">
          En une phrase, en anglais, sans marque ni texte. Sans photo, il est imaginé par l&apos;IA et l&apos;épisode porte « APERÇU ».
        </span>
        <textarea
          className="champ-saisie zone"
          rows={2}
          maxLength={800}
          placeholder="An amber glass perfume bottle with a gold stopper shaped like a hibiscus flower."
          value={cinema.objet ?? ""}
          onChange={(e) =>
            modifierLaSerie((c) => {
              if (e.target.value.trim() !== "") {
                c.objet = e.target.value;
                return;
              }
              // Sans objet décrit, aucun plan ne peut le montrer (sinon la fiche devient invalide).
              delete c.objet;
              for (const plan of c.episodes.flatMap((ep) => ep.scenes.flatMap((s) => s.plans))) plan.objet = false;
            })
          }
        />
      </label>

      <PhotoDuProduit
        filmId={filmId}
        photo={cinema.photoDeLObjet}
        objetDecrit={Boolean(cinema.objet?.trim())}
        avantDeDeposer={enregistrer}
        quandChange={(photo) =>
          modifierLaSerie((c) => {
            if (photo) c.photoDeLObjet = photo;
            else delete c.photoDeLObjet;
          })
        }
      />

      <h3 className="bloc-titre">Le budget</h3>
      <p className="champ-aide">
        {budget ? `${budget.utilises} plan${budget.utilises > 1 ? "s" : ""} payé${budget.utilises > 1 ? "s" : ""} sur ${plafond}.` : `Jusqu'à ${plafond} plans payés.`}{" "}
        Un plan refusé par Google n&apos;est ni payé ni compté.
      </p>
      <label className="champ">
        <span className="champ-question">Plans payés au plus pour ce film</span>
        <input
          type="number"
          className="champ-saisie petit"
          min={1}
          max={BUDGET_MAX}
          value={plafond}
          onChange={(e) => {
            const valeur = Math.round(Number(e.target.value));
            if (Number.isFinite(valeur) && valeur >= 1 && valeur <= BUDGET_MAX) modifierLaSerie((c) => void (c.budget = valeur));
          }}
        />
      </label>
    </section>
  );
}
