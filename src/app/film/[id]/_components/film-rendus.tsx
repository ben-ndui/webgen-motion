"use client";

import Link from "next/link";
import type { EtatDeDeclinaison, EtatDuRenduSurDisque } from "@/lib/film-etat";
import type { TypeDeRendu } from "@/lib/film-store";
import { type EtatDuRendu, cleDuRendu, useRenduDeFilm } from "./use-rendu-de-film";

const FORMAT = { long: "16:9 · 1920 × 1080", court: "9:16 · 1080 × 1920" } as const;

function megaOctets(octets: number): string {
  return `${(octets / 1024 / 1024).toFixed(1)} Mo`;
}

// L'état à afficher : celui du rendu lancé sur cette page s'il y en a un,
// sinon ce que le disque disait au chargement.
function etatAffiche(surDisque: EtatDuRenduSurDisque, etat: EtatDuRendu | undefined): EtatDuRendu {
  if (etat) return etat;
  if (surDisque.rendu) return { type: "fait", url: surDisque.rendu.url, octets: surDisque.rendu.octets };
  return { type: "repos" };
}

type PropsCarte = {
  declinaison: EtatDeDeclinaison;
  // Un épisode : son titre à la place du nom de déclinaison, et toujours vertical.
  episode?: { titre: string };
  // Ce que le disque dit de CE rendu : le film, ou la bibliothèque.
  surDisque: EtatDuRenduSurDisque;
  studio: boolean;
  etat: EtatDuRendu;
  occupe: boolean;
  onLancer: () => void;
  onAnnuler: () => void;
};

function CarteDeDeclinaison({ declinaison, episode, surDisque, studio, etat, occupe, onLancer, onAnnuler }: PropsCarte) {
  const bloquee = surDisque.problemes.length > 0;
  const titre = episode ? episode.titre : declinaison.nom;
  const version = episode ? "court" : declinaison.version;
  const enCours = etat.type === "en-cours";
  const pourcentage = enCours && etat.total > 0 ? Math.round((etat.frames / etat.total) * 100) : null;

  return (
    <li className="film-block film-rendu" data-wm-id="film.rendu">
      <div className="film-rendu-head">
        <div>
          <h3 className="film-h3">{titre}</h3>
          <p className="film-muted">
            {declinaison.langue.toUpperCase()} · {FORMAT[version]}
            {episode ? "" : ` · ${declinaison.avecContact ? "avec contact" : "sans contact"}`}
          </p>
        </div>
        {enCours ? (
          <button type="button" className="film-btn film-btn-ghost" onClick={onAnnuler}>
            Annuler
          </button>
        ) : (
          <button type="button" className="film-btn" onClick={onLancer} disabled={!studio || bloquee || occupe}>
            {etat.type === "fait" ? "Rendre à nouveau" : "Rendre"}
          </button>
        )}
      </div>

      {bloquee && (
        <ul className="film-list film-warning" aria-label={`Ce qui bloque ${titre}`}>
          {surDisque.problemes.map((probleme) => (
            <li key={probleme}>
              <code>{probleme}</code>
            </li>
          ))}
        </ul>
      )}

      {enCours && (
        <div role="status" className="film-progress">
          <span>{etat.label}</span>
          <progress max={100} value={pourcentage ?? undefined} aria-label="Progression du rendu" />
        </div>
      )}

      {etat.type === "erreur" && (
        <div className="film-alert" role="alert">
          <b>{etat.message}</b>
          {etat.details.length > 0 && (
            <ul className="film-list">
              {etat.details.map((detail, index) => (
                <li key={index}>
                  <code>{detail}</code>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {etat.type === "fait" && (
        <>
          <video className={`film-player film-player-${version}`} controls preload="metadata" src={etat.url} />
          <p className="film-muted">{megaOctets(etat.octets)}</p>
        </>
      )}
    </li>
  );
}

type PropsListe = {
  declinaisons: EtatDeDeclinaison[];
  type: TypeDeRendu;
  studio: boolean;
  rendus: ReturnType<typeof useRenduDeFilm>;
};

// Une carte par déclinaison, pour un type de rendu. Les déclinaisons sans
// bibliothèque n'apparaissent pas dans la liste de la bibliothèque.
function ListeDeRendus({ declinaisons, type, studio, rendus }: PropsListe) {
  return (
    <ul className="film-rendus">
      {declinaisons.map((declinaison) => {
        const surDisque = type === "film" ? declinaison : declinaison.bibliotheque;
        if (!surDisque) return null;
        return (
          <CarteDeDeclinaison
            key={declinaison.nom}
            declinaison={declinaison}
            surDisque={surDisque}
            studio={studio}
            etat={etatAffiche(surDisque, rendus.etats[cleDuRendu(type, declinaison.nom)])}
            occupe={rendus.enCours !== null}
            onLancer={() => void rendus.lancer(declinaison.nom, type)}
            onAnnuler={rendus.annuler}
          />
        );
      })}
    </ul>
  );
}

// Les épisodes de la série : une carte par épisode et par langue (la déclinaison porteuse).
function ListeDEpisodes({ declinaisons, studio, rendus }: Omit<PropsListe, "type">) {
  return (
    <ul className="film-rendus">
      {declinaisons.flatMap((declinaison) =>
        declinaison.episodes.map((episode) => (
          <CarteDeDeclinaison
            key={`${declinaison.nom}-${episode.id}`}
            declinaison={declinaison}
            episode={episode}
            surDisque={episode}
            studio={studio}
            etat={etatAffiche(episode, rendus.etats[cleDuRendu("episode", declinaison.nom, episode.id)])}
            occupe={rendus.enCours !== null}
            onLancer={() => void rendus.lancer(declinaison.nom, "episode", episode.id)}
            onAnnuler={rendus.annuler}
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
          <ListeDeRendus declinaisons={declinaisons} type="film" studio={studio} rendus={rendus} />
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
          <ListeDeRendus declinaisons={declinaisons} type="bibliotheque" studio={studio} rendus={rendus} />
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
          <ListeDEpisodes declinaisons={declinaisons} studio={studio} rendus={rendus} />
        </section>
      )}
    </>
  );
}
