"use client";

import type { EtatDeDeclinaison } from "@/lib/film-etat";
import { type EtatDuRendu, useRenduDeFilm } from "./use-rendu-de-film";

const FORMAT = { long: "16:9 · 1920 × 1080", court: "9:16 · 1080 × 1920" } as const;

function megaOctets(octets: number): string {
  return `${(octets / 1024 / 1024).toFixed(1)} Mo`;
}

// L'état à afficher : celui du rendu lancé sur cette page s'il y en a un,
// sinon ce que le disque disait au chargement.
function etatAffiche(declinaison: EtatDeDeclinaison, etat: EtatDuRendu | undefined): EtatDuRendu {
  if (etat) return etat;
  if (declinaison.rendu) return { type: "fait", url: declinaison.rendu.url, octets: declinaison.rendu.octets };
  return { type: "repos" };
}

type PropsCarte = {
  declinaison: EtatDeDeclinaison;
  etat: EtatDuRendu;
  occupe: boolean;
  onLancer: () => void;
  onAnnuler: () => void;
};

function CarteDeDeclinaison({ declinaison, etat, occupe, onLancer, onAnnuler }: PropsCarte) {
  const bloquee = declinaison.problemes.length > 0;
  const enCours = etat.type === "en-cours";
  const pourcentage = enCours && etat.total > 0 ? Math.round((etat.frames / etat.total) * 100) : null;

  return (
    <li className="film-block film-rendu" data-wm-id="film.rendu">
      <div className="film-rendu-head">
        <div>
          <h3 className="film-h3">{declinaison.nom}</h3>
          <p className="film-muted">
            {declinaison.langue.toUpperCase()} · {FORMAT[declinaison.version]} ·{" "}
            {declinaison.avecContact ? "avec contact" : "sans contact"}
          </p>
        </div>
        {enCours ? (
          <button type="button" className="film-btn film-btn-ghost" onClick={onAnnuler}>
            Annuler
          </button>
        ) : (
          <button type="button" className="film-btn" onClick={onLancer} disabled={bloquee || occupe}>
            {etat.type === "fait" ? "Rendre à nouveau" : "Rendre"}
          </button>
        )}
      </div>

      {bloquee && (
        <ul className="film-list film-warning" aria-label={`Ce qui bloque ${declinaison.nom}`}>
          {declinaison.problemes.map((probleme) => (
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
          <video className={`film-player film-player-${declinaison.version}`} controls preload="metadata" src={etat.url} />
          <p className="film-muted">{megaOctets(etat.octets)}</p>
        </>
      )}
    </li>
  );
}

/** Un bouton de rendu par déclinaison, sa progression, et le lecteur du rendu. */
export default function FilmRendus({ filmId, declinaisons }: { filmId: string; declinaisons: EtatDeDeclinaison[] }) {
  const { enCours, etats, lancer, annuler } = useRenduDeFilm(filmId);

  return (
    <section aria-labelledby="film-rendus-titre" className="film-section">
      <h2 id="film-rendus-titre" className="film-h2">
        Rendus
      </h2>
      {declinaisons.length === 0 ? (
        <p className="film-muted">Aucune déclinaison dans la fiche : rien à rendre.</p>
      ) : (
        <ul className="film-rendus">
          {declinaisons.map((declinaison) => (
            <CarteDeDeclinaison
              key={declinaison.nom}
              declinaison={declinaison}
              etat={etatAffiche(declinaison, etats[declinaison.nom])}
              occupe={enCours !== null}
              onLancer={() => void lancer(declinaison.nom)}
              onAnnuler={annuler}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
