"use client";

import { useFondSurMesure } from "./use-fond-sur-mesure";

const LIBELLES = { long: "Pour le clip complet (16:9)", court: "Pour le teaser (9:16)" } as const;

type Props = { id: string; version: "long" | "court"; prixUsd: string; descriptionPrete: boolean; avantDeGenerer: () => Promise<boolean> };

/** Le décor d'UN format : son bouton (prix compris), sa génération en cours, puis l'aperçu de la boucle. */
export default function FondDUnFormat({ id, version, prixUsd, descriptionPrete, avantDeGenerer }: Props) {
  const { etat, generer } = useFondSurMesure(id, version, avantDeGenerer);
  return (
    <div className="champ" data-wm-id={`format.karaoke.fond-${version}`}>
      <span className="champ-question">{LIBELLES[version]}</span>
      {etat.type === "lecture" && <p className="champ-aide" role="status">Lecture…</p>}
      {etat.type === "en-cours" && <p className="champ-aide" role="status">Google fabrique ton décor : une à trois minutes.</p>}
      {etat.type === "pret" && (
        <video className="film-player" src={`/api/motion/formats/${encodeURIComponent(id)}/media?relatif=${encodeURIComponent(etat.video)}`}
          muted loop autoPlay playsInline aria-label={`Ton décor ${LIBELLES[version].toLowerCase()}`} />
      )}
      {etat.type === "erreur" && <p className="depot-erreur" role="alert">{etat.message}</p>}
      {(etat.type === "aucun" || etat.type === "pret" || (etat.type === "erreur" && !etat.studio)) && (
        <button type="button" className="film-btn" disabled={!descriptionPrete} onClick={() => void generer()}>
          {etat.type === "pret" ? `Refaire ce décor (${prixUsd})` : `Générer ce décor (${prixUsd})`}
        </button>
      )}
    </div>
  );
}
