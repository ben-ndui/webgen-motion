import "../../film.css";
import Link from "next/link";
import type { ResumeDuFilm, StatutDuFilm } from "@/lib/film-etat";
import FilmMedias from "./film-medias";
import FilmRendus from "./film-rendus";
import FilmResume from "./film-resume";

const LIBELLE_DU_STATUT: Record<StatutDuFilm, string> = {
  brouillon: "Brouillon",
  "medias-manquants": "Médias à revoir",
  pret: "Prêt à rendre",
  rendu: "Rendu",
};

function Entete({ titre, statut, id }: { titre: string; statut: StatutDuFilm | null; id: string }) {
  return (
    <header className="film-head">
      <Link className="film-back" href="/dashboard">
        ← Hub
      </Link>
      <p className="film-kicker">Film de marque · films/{id}.json</p>
      <div className="film-title-row">
        <h1 className="film-title">{titre}</h1>
        {statut && <span className={`film-status film-status-${statut}`}>{LIBELLE_DU_STATUT[statut]}</span>}
      </div>
    </header>
  );
}

/**
 * La page d'un film, dans ses trois cas : fiche introuvable, fiche invalide
 * (toutes les erreurs de `erreursDeLaSpec`, avec le chemin du champ), fiche
 * valide (résumé, médias attendus, rendus).
 */
export default function FilmVue({ id, resume }: { id: string; resume: ResumeDuFilm | null }) {
  if (!resume) {
    return (
      <main className="gm-film">
        <Entete titre="Film introuvable" statut={null} id={id} />
        <div className="film-block">
          <p>
            Aucune fiche <code>films/{id}.json</code> dans le dossier du projet.
          </p>
          <p className="film-muted">
            Une fiche se crée au format FilmSpec (gabarit film-motion du brain), sous un nom fait de lettres,
            chiffres, _ et -.
          </p>
        </div>
      </main>
    );
  }

  if (resume.erreurs.length > 0) {
    return (
      <main className="gm-film">
        <Entete titre={resume.id} statut={resume.statut} id={id} />
        <div className="film-block film-alert" role="alert">
          <h2 className="film-h2">
            Fiche invalide · {resume.erreurs.length} erreur{resume.erreurs.length > 1 ? "s" : ""}
          </h2>
          <p className="film-muted">Corriger ces champs dans films/{id}.json, puis recharger la page.</p>
          <ul className="film-list">
            {resume.erreurs.map((erreur) => (
              <li key={erreur}>
                <code>{erreur}</code>
              </li>
            ))}
          </ul>
        </div>
      </main>
    );
  }

  return (
    <main className="gm-film">
      <Entete titre={resume.nom} statut={resume.statut} id={id} />
      <div className="film-grid">
        <FilmResume resume={resume} />
        {resume.medias && <FilmMedias medias={resume.medias} />}
      </div>
      <FilmRendus filmId={resume.id} declinaisons={resume.declinaisons} />
    </main>
  );
}
