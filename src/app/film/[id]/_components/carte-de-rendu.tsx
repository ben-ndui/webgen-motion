"use client";

import type { ReactNode } from "react";
import type { EtatDeDeclinaison, EtatDuRenduSurDisque } from "@/lib/film-etat";
import type { EtatDuRendu } from "./use-rendu-de-film";
import SuiviDuRendu from "@/app/_components/progression/suivi-du-rendu";
import { direUneDuree } from "@/lib/suivi-du-rendu";

const FORMAT = { long: "16:9 · 1920 × 1080", court: "9:16 · 1080 × 1920" } as const;

function megaOctets(octets: number): string {
  return `${(octets / 1024 / 1024).toFixed(1)} Mo`;
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
  // L'export vers DaVinci Resolve, proposé une fois le rendu fait.
  exporter?: ReactNode;
};

/** Une carte de rendu : son bouton, sa progression, ses erreurs, puis le lecteur et l'export. */
export default function CarteDeRendu({ declinaison, episode, surDisque, studio, etat, occupe, onLancer, onAnnuler, exporter }: PropsCarte) {
  const bloquee = surDisque.problemes.length > 0;
  const titre = episode ? episode.titre : declinaison.nom;
  const version = episode ? "court" : declinaison.version;
  const enCours = etat.type === "en-cours";

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

      {etat.type === "en-cours" && <SuiviDuRendu etat={etat} />}

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
          <p className="film-muted">
            {typeof etat.duree === "number" && `Rendu en ${direUneDuree(etat.duree)} · `}
            {megaOctets(etat.octets)}
          </p>
          {studio && exporter}
        </>
      )}
    </li>
  );
}
