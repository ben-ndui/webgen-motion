import type { EtatDesMedias, MediaAttendu } from "@/lib/film-medias";

function etatDuMedia(media: MediaAttendu): string {
  if (media.horsDuDossier) return "Refusé · hors du dossier";
  return media.present ? "Présent" : "Manquant";
}

/**
 * Les médias que la fiche attend, présents ou manquants, et le chemin EXACT
 * du dossier où les déposer. Les doublons (deux états identiques) bloquent
 * aussi le rendu : un plan qui ne bouge pas.
 */
export default function FilmMedias({ medias }: { medias: EtatDesMedias }) {
  const manquants = medias.medias.filter((media) => !media.present).length;
  return (
    <section className="film-block" aria-labelledby="film-medias-titre">
      <h2 id="film-medias-titre" className="film-h2">
        Médias · {medias.medias.length - manquants}/{medias.medias.length} présents
      </h2>
      <p className="film-muted">À déposer dans :</p>
      <code className="film-path">{medias.dossierPublic}</code>
      <p className="film-muted">Après un dépôt, recharger la page : l'état est relu sur le disque.</p>

      {medias.medias.length === 0 ? (
        <p className="film-muted">Aucun média attendu : la fiche n'a aucune déclinaison.</p>
      ) : (
        <ul className="film-media-list">
          {medias.medias.map((media) => (
            <li key={media.relatif} className={media.present ? "is-ok" : "is-missing"}>
              <code>{media.relatif}</code>
              <span className="film-media-meta">
                {media.langues.map((langue) => langue.toUpperCase()).join(" · ")}
              </span>
              <span className="film-media-state">{etatDuMedia(media)}</span>
            </li>
          ))}
        </ul>
      )}

      {medias.doublons.length > 0 && (
        <div className="film-warning" role="alert">
          <b>Captures identiques</b>
          <ul className="film-list">
            {medias.doublons.map((doublon) => (
              <li key={doublon.message}>
                {doublon.langue.toUpperCase()} · {doublon.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
