import CadreDuFilm, { EnTeteDuFilm } from "./_components/cadre-du-film";

/** Pendant la lecture de la fiche et des médias sur le disque. */
export default function FilmLoading() {
  return (
    <CadreDuFilm nom="Chargement…">
      <div aria-busy="true">
        <EnTeteDuFilm id="…" titre="Chargement du film" sousTitre="Lecture de la fiche et des médias…" />
        <p className="film-muted" role="status">
          Lecture de la fiche et des médias…
        </p>
      </div>
    </CadreDuFilm>
  );
}
