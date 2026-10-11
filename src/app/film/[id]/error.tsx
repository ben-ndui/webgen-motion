"use client";

import CadreDuFilm from "./_components/cadre-du-film";

/**
 * Erreur inattendue en lisant le film (disque illisible, droits…). Une fiche
 * INVALIDE n'arrive pas ici : elle a son propre écran, avec ses erreurs.
 */
export default function FilmError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <CadreDuFilm nom="Erreur">
      <div className="film-block film-alert" role="alert">
        <h1 className="film-h2">Lecture du film impossible</h1>
        <p className="film-muted">{error.digest ? `Erreur serveur (réf. ${error.digest})` : error.message}</p>
        <button type="button" className="film-btn" onClick={() => unstable_retry()}>
          Réessayer
        </button>
      </div>
    </CadreDuFilm>
  );
}
