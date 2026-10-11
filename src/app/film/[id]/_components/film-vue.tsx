import type { ResumeDuFilm, StatutDuFilm } from "@/lib/film-etat";
import { PointDeMeta } from "../../../_components/app-top-bar";
import CadreDuFilm, { EnTeteDuFilm } from "./cadre-du-film";
import FilmMedias from "./film-medias";
import FilmRendus from "./film-rendus";
import FilmResume from "./film-resume";

const LIBELLE_DU_STATUT: Record<StatutDuFilm, string> = {
  brouillon: "Brouillon",
  "medias-manquants": "Médias à revoir",
  pret: "Prêt à rendre",
  rendu: "Rendu",
};

function Statut({ statut }: { statut: StatutDuFilm }) {
  return <span className={`film-status film-status-${statut}`}>{LIBELLE_DU_STATUT[statut]}</span>;
}

function MetaDuFilm({ resume }: { resume: ResumeDuFilm }) {
  const nombre = resume.declinaisons.length;
  return (
    <>
      <span>
        {nombre} déclinaison{nombre > 1 ? "s" : ""}
      </span>
      <PointDeMeta />
      <span>{resume.langues.map((langue) => langue.toUpperCase()).join(" · ") || "aucune langue"}</span>
    </>
  );
}

/**
 * La page d'un film, dans ses trois cas : fiche introuvable, fiche invalide
 * (toutes les erreurs de `erreursDeLaSpec`, avec le chemin du champ), fiche
 * valide (rendus, et à côté la fiche et les médias).
 */
type PropsVue = { id: string; resume: ResumeDuFilm | null; studio: boolean };

export default function FilmVue({ id, resume, studio }: PropsVue) {
  if (!resume) {
    return (
      <CadreDuFilm nom={id}>
        <EnTeteDuFilm id={id} titre="Film introuvable" sousTitre="Aucune fiche à ce nom dans le dossier du projet." />
        <div className="film-block">
          <p>
            Aucune fiche <code>films/{id}.json</code> dans le dossier du projet.
          </p>
          <p className="film-muted">
            Une fiche se crée au format FilmSpec (gabarit film-motion du brain), sous un nom fait de lettres,
            chiffres, _ et -.
          </p>
        </div>
      </CadreDuFilm>
    );
  }

  if (resume.erreurs.length > 0) {
    return (
      <CadreDuFilm nom={resume.id}>
        <EnTeteDuFilm
          id={id}
          titre={resume.id}
          sousTitre="La fiche ne peut pas être rendue tant que ces champs ne sont pas corrigés."
          statut={<Statut statut={resume.statut} />}
        />
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
      </CadreDuFilm>
    );
  }

  return (
    <CadreDuFilm nom={resume.nom} meta={<MetaDuFilm resume={resume} />}>
      <EnTeteDuFilm
        id={id}
        titre={resume.nom}
        sousTitre="Chaque déclinaison se rend depuis la fiche. Les médias et les rendus sont relus sur le disque à chaque chargement de la page."
        statut={<Statut statut={resume.statut} />}
      />
      <div className="two-col">
        <div className="film-main">
          <FilmRendus filmId={resume.id} declinaisons={resume.declinaisons} studio={studio} />
        </div>
        <aside className="side-stack">
          <FilmResume resume={resume} />
          {resume.medias && <FilmMedias medias={resume.medias} />}
        </aside>
      </div>
    </CadreDuFilm>
  );
}
