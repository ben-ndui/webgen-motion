"use client";

import Link from "next/link";
import type { EtatDeDeclinaison, EtatDuRenduSurDisque } from "@/lib/film-etat";
import type { TypeDeRendu } from "@/lib/film-store";
import CarteDeRendu from "./carte-de-rendu";
import ExportVersLeMontage from "./export-vers-le-montage";
import { type EtatDuRendu, cleDuRendu, useRenduDeFilm } from "./use-rendu-de-film";

// L'état à afficher : celui du rendu lancé sur cette page s'il y en a un,
// sinon ce que le disque disait au chargement.
function etatAffiche(surDisque: EtatDuRenduSurDisque, etat: EtatDuRendu | undefined): EtatDuRendu {
  if (etat) return etat;
  if (surDisque.rendu) return { type: "fait", url: surDisque.rendu.url, octets: surDisque.rendu.octets, duree: null };
  return { type: "repos" };
}

type PropsListe = {
  filmId: string;
  declinaisons: EtatDeDeclinaison[];
  type: TypeDeRendu;
  studio: boolean;
  rendus: ReturnType<typeof useRenduDeFilm>;
};

// Une carte par déclinaison, pour un type de rendu. Les déclinaisons sans
// bibliothèque n'apparaissent pas dans la liste de la bibliothèque.
function ListeDeRendus({ filmId, declinaisons, type, studio, rendus }: PropsListe) {
  return (
    <ul className="film-rendus">
      {declinaisons.map((declinaison) => {
        const surDisque = type === "film" ? declinaison : declinaison.bibliotheque;
        if (!surDisque) return null;
        return (
          <CarteDeRendu
            key={declinaison.nom}
            declinaison={declinaison}
            surDisque={surDisque}
            studio={studio}
            etat={etatAffiche(surDisque, rendus.etats[cleDuRendu(type, declinaison.nom)])}
            occupe={rendus.enCours !== null}
            onLancer={() => void rendus.lancer(declinaison.nom, type)}
            onAnnuler={rendus.annuler}
            exporter={
              type === "film" && (
                <ExportVersLeMontage url={`/api/motion/film/${encodeURIComponent(filmId)}/otio`} declinaison={declinaison.nom} nomDuFichier={`${declinaison.nom}.otio`} />
              )
            }
          />
        );
      })}
    </ul>
  );
}

// Les épisodes de la série : une carte par épisode et par langue (la déclinaison porteuse).
function ListeDEpisodes({ filmId, declinaisons, studio, rendus }: Omit<PropsListe, "type">) {
  return (
    <ul className="film-rendus">
      {declinaisons.flatMap((declinaison) =>
        declinaison.episodes.map((episode) => (
          <CarteDeRendu
            key={`${declinaison.nom}-${episode.id}`}
            declinaison={declinaison}
            episode={episode}
            surDisque={episode}
            studio={studio}
            etat={etatAffiche(episode, rendus.etats[cleDuRendu("episode", declinaison.nom, episode.id)])}
            occupe={rendus.enCours !== null}
            onLancer={() => void rendus.lancer(declinaison.nom, "episode", episode.id)}
            onAnnuler={rendus.annuler}
            exporter={
              <ExportVersLeMontage
                url={`/api/motion/film/${encodeURIComponent(filmId)}/cinema/episodes/${encodeURIComponent(episode.id)}/otio`}
                declinaison={declinaison.nom}
                nomDuFichier={`${declinaison.nom}.episode-${episode.id}.otio`}
              />
            }
          />
        )),
      )}
    </ul>
  );
}

/**
 * Un bouton de rendu par déclinaison, sa progression, et le lecteur du rendu.
 * Si la fiche a une bibliothèque, ses plans se rendent dans une seconde liste.
 */
type PropsRendus = { filmId: string; declinaisons: EtatDeDeclinaison[]; studio: boolean };

export default function FilmRendus({ filmId, declinaisons, studio }: PropsRendus) {
  const rendus = useRenduDeFilm(filmId);
  const avecBibliotheque = declinaisons.some((declinaison) => declinaison.bibliotheque !== null);
  const avecEpisodes = declinaisons.some((declinaison) => declinaison.episodes.length > 0);

  return (
    <>
      <section aria-labelledby="film-rendus-titre" className="film-section">
        <div className="film-section-head">
          <span className="kicker">Le film</span>
          <h2 id="film-rendus-titre" className="film-h2">
            Rendus
          </h2>
        </div>
        {!studio && (
          <div className="film-block" data-wm-id="film.studio">
            <p>
              <b>Le rendu des films de marque fait partie de Studio Edition.</b>
            </p>
            <p className="film-muted">Les rendus déjà faits restent lisibles ci-dessous.</p>
            <Link className="film-btn" href="/setup">
              Activer une licence Studio
            </Link>
          </div>
        )}
        {declinaisons.length === 0 ? (
          <p className="film-muted">Aucune déclinaison dans la fiche : rien à rendre.</p>
        ) : (
          <ListeDeRendus filmId={filmId} declinaisons={declinaisons} type="film" studio={studio} rendus={rendus} />
        )}
      </section>

      {avecBibliotheque && (
        <section aria-labelledby="film-bibliotheque-titre" className="film-section" data-wm-id="film.bibliotheque">
          <div className="film-section-head">
            <span className="kicker">Les plans seuls</span>
            <h2 id="film-bibliotheque-titre" className="film-h2">
              Bibliothèque de plans
            </h2>
            <p className="film-muted">
              Typo cinétique, barre d&apos;adresse, éventail de captures et logo construit, sur la musique du film.
            </p>
          </div>
          <ListeDeRendus filmId={filmId} declinaisons={declinaisons} type="bibliotheque" studio={studio} rendus={rendus} />
        </section>
      )}

      {avecEpisodes && (
        <section aria-labelledby="film-serie-titre" className="film-section" data-wm-id="film.serie">
          <div className="film-section-head">
            <span className="kicker">Générée par IA</span>
            <h2 id="film-serie-titre" className="film-h2">
              La série
            </h2>
            <p className="film-muted">
              Chaque épisode monté, en vertical. Un épisode se rend quand tous ses plans sont générés (étape « Ta série »). À la publication, coche
              l&apos;étiquette « contenu généré par IA » de la plateforme.
            </p>
          </div>
          <ListeDEpisodes filmId={filmId} declinaisons={declinaisons} studio={studio} rendus={rendus} />
        </section>
      )}
    </>
  );
}
