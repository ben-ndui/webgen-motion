import type { EtatDesMedias, MediaAttendu } from "@/lib/film-medias";

function etatDuMedia(media: MediaAttendu): string {
  if (media.horsDuDossier) return "Refusé · hors du dossier";
  return media.present ? "Présent" : "Manquant";
}

function ListeDeMedias({ medias }: { medias: MediaAttendu[] }) {
  return (
    <ul className="film-media-list">
      {medias.map((media) => (
        <li key={media.relatif} className={media.present ? "is-ok" : "is-missing"}>
          <code>{media.relatif}</code>
          <span className="film-media-meta">{media.langues.map((langue) => langue.toUpperCase()).join(" · ")}</span>
          <span className="film-media-state">{etatDuMedia(media)}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Les médias que la fiche attend et le chemin EXACT du dossier où les
 * déposer. Les manquants restent toujours affichés ; les présents se
 * replient. Les doublons (deux états identiques) bloquent aussi le rendu.
 */
export default function FilmMedias({ medias }: { medias: EtatDesMedias }) {
  const manquants = medias.medias.filter((media) => !media.present);
  const presents = medias.medias.filter((media) => media.present);
  return (
    <section className="side-card" aria-labelledby="film-medias-titre" data-wm-id="film.medias">
      <h2 id="film-medias-titre" className="side-title">
        Médias · {presents.length}/{medias.medias.length} présents
      </h2>
      <p className="film-muted">À déposer dans :</p>
      <code className="film-path">{medias.dossierPublic}</code>
      <p className="film-muted">Après un dépôt, recharger la page : l&apos;état est relu sur le disque.</p>

      {medias.medias.length === 0 && (
        <p className="film-muted">Aucun média attendu : la fiche n&apos;a aucune déclinaison.</p>
      )}
      {manquants.length > 0 && <ListeDeMedias medias={manquants} />}
      {presents.length > 0 && (
        <details className="film-details">
          <summary>
            {presents.length} fichier{presents.length > 1 ? "s" : ""} présent{presents.length > 1 ? "s" : ""}
          </summary>
          <ListeDeMedias medias={presents} />
        </details>
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
