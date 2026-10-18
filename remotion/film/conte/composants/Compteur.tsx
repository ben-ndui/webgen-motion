import { useCurrentFrame } from "remotion";

import { transparence } from "../../marque/couleurs";
import { useCouleurs } from "../../marque/MarqueDuFilm";
import type { Format } from "../../lib/format";
import { RESERVE_HAUT } from "../../lib/format";
import { progression } from "../../lib/mouvement";
import type { Langue } from "../../spec";
import type { Instant } from "../instants";
import type { CompteurDuConte } from "../spec";
import { CHUTE, SOLUTION, ecrireLeCompteur, valeurPendantLaChute } from "../trame";

type Props = {
  compteur: CompteurDuConte;
  objets: number;
  libelle: string;
  unite: string;
  langue: Langue;
  format: Format;
  instant: Instant;
};

/**
 * Le compteur du coin : il grimpe à chaque objet qui touche le sol, puis le
 * total se barre et la nouvelle valeur arrive en pastille d'accent.
 */
export function Compteur({ compteur, objets, libelle, unite, langue, format, instant }: Props) {
  const couleurs = useCouleurs();
  const image = useCurrentFrame();
  const apparition = progression(image, instant("chute", CHUTE.titre), 10);
  if (apparition === 0) return null;
  const tombes = Array.from({ length: objets }, (_, i) => instant("chute", CHUTE.premierAtterrissage + i)).filter((a) => image >= a).length;
  const valeur = valeurPendantLaChute(compteur.total, tombes, objets, compteur.decimales);
  const barre = progression(image, instant("solution", SOLUTION.totalBarre), 10);
  const apres = progression(image, instant("solution", SOLUTION.apres), 12);
  const texte = (v: number) => ecrireLeCompteur(v, compteur.decimales, unite, langue);
  return (
    <div
      style={{
        position: "absolute",
        // En 9:16, centré au-dessus des titres : à droite, il mordait sur eux.
        top: format === "paysage" ? 48 : RESERVE_HAUT + 10,
        ...(format === "paysage" ? { right: 60 } : { left: "50%", transform: "translateX(-50%)" }),
        padding: "14px 22px",
        borderRadius: 16,
        background: transparence(couleurs.encre, 0.7),
        border: `2px solid ${transparence(couleurs.clair, 0.18)}`,
        clipPath: `inset(0 0 ${(1 - apparition) * 100}% 0 round 16px)`,
        textAlign: format === "paysage" ? "right" : "center",
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: couleurs.clairLibelle }}>
        {libelle}
      </div>
      <div style={{ position: "relative", display: "inline-block", fontSize: 44, fontWeight: 700, color: couleurs.clair }}>
        {texte(valeur)}
        <span style={{ position: "absolute", left: 0, top: "52%", height: 5, width: `${barre * 100}%`, background: couleurs.accentSurSombre }} />
      </div>
      {apres > 0 ? (
        <div style={{ marginTop: 10, clipPath: `inset(0 ${(1 - apres) * 100}% 0 0 round 999px)` }}>
          <span style={{ display: "inline-block", padding: "6px 18px", borderRadius: 999, background: couleurs.accent, color: couleurs.clair, fontSize: 36, fontWeight: 700 }}>
            {texte(compteur.apres)}
          </span>
        </div>
      ) : null}
    </div>
  );
}
