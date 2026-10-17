"use client";

import type { ResumeDuProjet } from "@/lib/formats/format-etat";
import type { EtatDuRendu } from "@/lib/use-rendu-en-flux";

const FORMAT: Record<string, string> = { long: "16:9 · 1920 × 1080", court: "9:16 · 1080 × 1920" };

type Props = {
  declinaison: ResumeDuProjet["declinaisons"][number];
  // Contenu d'exemple ou fichier manquant : le bouton ne peut pas aboutir, on ne le propose pas.
  bloque: boolean;
  studio: boolean;
  etat: EtatDuRendu;
  occupe: boolean;
  onLancer: () => void;
  onAnnuler: () => void;
};

/** Une déclinaison : son bouton, sa progression, ses erreurs (avec la fin du journal), puis le lecteur. */
export default function RenduDeFormat({ declinaison, bloque, studio, etat, occupe, onLancer, onAnnuler }: Props) {
  const enCours = etat.type === "en-cours";
  const pourcentage = enCours && etat.total > 0 ? Math.round((etat.frames / etat.total) * 100) : null;
  return (
    <li className="film-block film-rendu" data-wm-id="format.rendu">
      <div className="film-rendu-head">
        <div>
          <h3 className="film-h3">{declinaison.libelle}</h3>
          <p className="film-muted">
            {declinaison.langue.toUpperCase()} · {FORMAT[declinaison.version] ?? declinaison.version}
          </p>
        </div>
        {enCours ? (
          <button type="button" className="film-btn film-btn-ghost" onClick={onAnnuler}>
            Annuler
          </button>
        ) : (
          <button type="button" className="film-btn" onClick={onLancer} disabled={!studio || bloque || occupe}>
            {etat.type === "fait" ? "Rendre à nouveau" : "Rendre"}
          </button>
        )}
      </div>
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
          <p className="film-muted">{(etat.octets / 1024 / 1024).toFixed(1)} Mo</p>
        </>
      )}
    </li>
  );
}
