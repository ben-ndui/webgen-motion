import { useCurrentFrame, useVideoConfig } from "remotion";

import { useCouleurs } from "../../marque/MarqueDuFilm";
import { useFormat } from "../../lib/format";
import { MARGE_PORTRAIT, RESERVE_BAS } from "../../lib/format";
import type { LigneCalee } from "../alignement";
import { ligneEnCours, remplissage } from "../lecture";

type Props = { lignes: LigneCalee[] };

/**
 * La ligne chantée, ses mots qui se remplissent de l'accent au rythme du chant,
 * et la ligne suivante, plus petite, pour lire en avance. Le remplissage est un
 * dégradé dans le texte : aucune opacité, aucun mouvement.
 */
export function Paroles({ lignes }: Props) {
  const couleurs = useCouleurs();
  const image = useCurrentFrame();
  const { fps } = useVideoConfig();
  const format = useFormat();
  const t = image / fps;
  const index = ligneEnCours(lignes, t);
  if (index < 0) return null;
  const ligne = lignes[index]!;
  const suivante = lignes[index + 1];
  const taille = format === "paysage" ? 64 : 62;
  return (
    <div
      style={{
        position: "absolute",
        left: format === "paysage" ? 100 : MARGE_PORTRAIT,
        right: format === "paysage" ? 100 : MARGE_PORTRAIT,
        // Les lignes qui passent à la ligne se coupent en deux moitiés égales, sans mot orphelin.
        textWrap: "balance",
        bottom: format === "paysage" ? 120 : RESERVE_BAS + 60,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: taille, fontWeight: 800, lineHeight: 1.12, textTransform: "uppercase", letterSpacing: "-0.01em" }}>
        {ligne.mots.map((mot, i) => {
          const rempli = Math.round(remplissage(mot, t) * 100);
          return (
            <span
              key={i}
              style={{
                backgroundImage: `linear-gradient(90deg, ${couleurs.accentSurSombre} ${rempli}%, ${couleurs.clair} ${rempli}%)`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                // Une ombre sombre sous les lettres : lisibles sur le soleil comme sur la grille.
                filter: `drop-shadow(0 4px 10px ${couleurs.encre})`,
              }}
            >
              {mot.texte}{" "}
            </span>
          );
        })}
      </div>
      {suivante ? (
        <div style={{ marginTop: 18, fontSize: taille * 0.5, fontWeight: 600, textTransform: "uppercase", color: couleurs.clairSecondaire }}>
          {suivante.mots.map((m) => m.texte).join(" ")}
        </div>
      ) : null}
    </div>
  );
}
