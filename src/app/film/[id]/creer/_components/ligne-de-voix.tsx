"use client";

import type { LigneDeVoix } from "../../../../../../remotion/film/spec";

const SECONDES = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

type Props = {
  titre: string;
  ligne: LigneDeVoix;
  // Secondes de parole que laisse le plan.
  disponible: number | undefined;
  onTexte: (texte: string) => void;
  onRetirer: () => void;
};

/** Une phrase de voix off : son texte, le temps qu'elle a, et où elle en est. */
export default function LigneDeVoixOff({ titre, ligne, disponible, onTexte, onRetirer }: Props) {
  const tropLongue = ligne.duree !== undefined && disponible !== undefined && ligne.duree > disponible;
  const etat = !ligne.fichier
    ? { classe: "a-generer", texte: "À générer" }
    : tropLongue
      ? { classe: "trop-longue", texte: `Trop longue : ${SECONDES.format(ligne.duree!)} s pour ${SECONDES.format(disponible!)} s` }
      : { classe: "generee", texte: `Générée · ${SECONDES.format(ligne.duree ?? 0)} s` };

  return (
    <div className="ligne-voix">
      <div className="champ-tete">
        <span className="champ-question">{titre}</span>
        <span className={`voix-etat ${etat.classe}`} role={tropLongue ? "alert" : undefined}>{etat.texte}</span>
      </div>
      <textarea
        className="champ-saisie zone"
        rows={2}
        value={ligne.texte}
        aria-label={`Voix off : ${titre}`}
        onChange={(e) => onTexte(e.target.value)}
      />
      <div className="ligne-voix-pied">
        <span className="champ-compteur">{disponible !== undefined ? `${SECONDES.format(disponible)} s de parole sur ce plan` : ""}</span>
        <button type="button" className="lien" onClick={onRetirer}>Retirer</button>
      </div>
    </div>
  );
}
