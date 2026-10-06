import "../film.css";

/** Pendant la lecture de la fiche et des médias sur le disque. */
export default function FilmLoading() {
  return (
    <main className="gm-film" aria-busy="true">
      <p className="film-kicker">Film de marque</p>
      <p className="film-muted" role="status">
        Lecture de la fiche et des médias…
      </p>
    </main>
  );
}
