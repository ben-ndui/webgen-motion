import Link from "next/link";

/**
 * Section « Films de marque » du hub : une carte par fiche `films/<id>.json`,
 * avec un statut tiré du disque (calculé côté serveur par film-etat.ts).
 * Trois états explicites : erreur de lecture, aucun film, liste.
 */

export type HubFilmStatus = "brouillon" | "medias-manquants" | "pret" | "rendu";

export interface HubFilm {
  id: string;
  nom: string;
  statut: HubFilmStatus;
  langues: string[];
  declinaisons: number;
  rendus: number;
  // Nombre d'erreurs de la fiche (0 = fiche valide).
  erreurs: number;
}

const STATUS_LABEL: Record<HubFilmStatus, string> = {
  brouillon: "Brouillon",
  "medias-manquants": "Médias à revoir",
  pret: "Prêt à rendre",
  rendu: "Rendu",
};

// Mêmes pastilles que les tours : brouillon gris, prêt en accent, rendu encre.
const STATUS_CLASS: Record<HubFilmStatus, string> = {
  brouillon: "draft",
  "medias-manquants": "missing",
  pret: "ready",
  rendu: "rendered",
};

function detailDuStatut(film: HubFilm): string {
  if (film.erreurs > 0) return `fiche invalide · ${film.erreurs} erreur${film.erreurs > 1 ? "s" : ""}`;
  if (film.statut === "rendu") return `${film.rendus}/${film.declinaisons} rendus`;
  return `${film.declinaisons} déclinaison${film.declinaisons > 1 ? "s" : ""}`;
}

function FilmCard({ film }: { film: HubFilm }) {
  return (
    <Link className="tcard fcard" href={`/film/${film.id}`} data-wm-id="hub.film.card">
      <div className="tbody">
        <div className="tbody-top">
          <h3 className="tname">{film.nom}</h3>
        </div>
        <div className="tmeta">
          <span className="tcat">Film de marque</span>
          <span>{film.id}.json</span>
          {film.langues.length > 0 && (
            <>
              <span className="sep" />
              <span>{film.langues.map((langue) => langue.toUpperCase()).join(" · ")}</span>
            </>
          )}
        </div>
        <div className="tfoot">
          <span className={"status " + STATUS_CLASS[film.statut]}>
            <span className="sdot" />
            {STATUS_LABEL[film.statut]}
          </span>
          <span className="tedit">{detailDuStatut(film)}</span>
        </div>
      </div>
    </Link>
  );
}

export default function HubFilms({ films, error }: { films: HubFilm[]; error: string | null }) {
  return (
    <section id="films" className="films-wrap" data-wm-id="hub.films" aria-labelledby="hub-films-title">
      <h2 id="hub-films-title" className="section-title">
        Films de marque <span className="n">{error ? "" : films.length}</span>
      </h2>
      {error ? (
        <div className="films-note error" role="alert">
          <b>Impossible de lire le dossier films/</b>
          <span>{error}</span>
        </div>
      ) : films.length === 0 ? (
        <div className="films-note">
          <b>Aucun film de marque</b>
          <span>
            Pour en créer un : déposer une fiche <code>films/&lt;id&gt;.json</code> au format FilmSpec (gabarit
            film-motion du brain), puis ses captures et sa musique dans{" "}
            <code>~/.webgen-motion/films/&lt;id&gt;/public/</code>.
          </span>
        </div>
      ) : (
        <div className="grid">
          {films.map((film) => (
            <FilmCard key={film.id} film={film} />
          ))}
        </div>
      )}
    </section>
  );
}
