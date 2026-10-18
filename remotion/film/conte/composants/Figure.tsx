import { Img, staticFile } from "remotion";

import { Picto } from "../../composants/Picto";
import { useCouleurs } from "../../marque/MarqueDuFilm";
import type { FigureDuConte } from "../spec";

type Props = { figure: FigureDuConte; taille: number; enTuile?: boolean };

/**
 * Un héros ou un objet : un pictogramme maison, ou l'image du produit.
 * `enTuile` : posé sur une tuile claire (les objets), lisible sur la neige.
 */
export function Figure({ figure, taille, enTuile = false }: Props) {
  const couleurs = useCouleurs();
  const dessin =
    figure.type === "image" ? (
      <Img src={staticFile(figure.fichier)} style={{ width: taille * Math.min(1, figure.rapport), height: taille / Math.max(1, figure.rapport) }} />
    ) : enTuile ? (
      <Picto nom={figure.picto} taille={taille * 0.7} corps={couleurs.encre} trait={couleurs.clair} accent={couleurs.accent} />
    ) : (
      <Picto nom={figure.picto} taille={taille} corps={couleurs.accentSurSombre} trait={couleurs.encre} accent={couleurs.clair} />
    );
  if (!enTuile) return dessin;
  return (
    <div
      style={{
        width: taille,
        height: taille,
        borderRadius: taille * 0.26,
        background: couleurs.clair,
        boxShadow: `0 10px 30px ${couleurs.encre}55, 0 0 0 2px ${couleurs.accent}33`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {dessin}
    </div>
  );
}
