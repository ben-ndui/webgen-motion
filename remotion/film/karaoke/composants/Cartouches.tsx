import { useCurrentFrame, useVideoConfig } from "remotion";

import { Revele } from "../../composants/Revele";
import { useCouleurs, useMarque } from "../../marque/MarqueDuFilm";
import { useFormat } from "../../lib/format";
import { RESERVE_HAUT } from "../../lib/format";
import type { MorceauDuKaraoke } from "../spec";

// Une ombre portée sombre sous les cartes : lisibles même quand le soleil bat derrière.
const OMBRE = "drop-shadow(0 4px 14px rgba(0,0,0,0.55))";

/** En haut à gauche, tout le long : l'artiste et le titre, comme sur un clip. */
export function Signature({ morceau, apres }: { morceau: MorceauDuKaraoke; apres: number }) {
  const couleurs = useCouleurs();
  const format = useFormat();
  const image = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Pas de signature pendant la carte de titre : elle dirait la même chose, en plus petit.
  if (image / fps < apres) return null;
  return (
    <div style={{ position: "absolute", top: format === "paysage" ? 44 : RESERVE_HAUT + 10, left: format === "paysage" ? 56 : 60 }}>
      <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color: couleurs.accentSurSombre }}>{morceau.artiste}</div>
      <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: couleurs.clairSecondaire }}>{morceau.titre}</div>
    </div>
  );
}

/** Le titre en grand, au centre, jusqu'au premier mot chanté. */
export function CarteDeTitre({ morceau, jusqua }: { morceau: MorceauDuKaraoke; jusqua: number }) {
  const couleurs = useCouleurs();
  const image = useCurrentFrame();
  const { fps } = useVideoConfig();
  const format = useFormat();
  if (image / fps >= jusqua) return null;
  return (
    // Au-dessus du soleil : l'orange sur orange ne se lit pas. En 9:16, sous la réserve du haut.
    <div style={{ position: "absolute", left: 0, right: 0, top: format === "paysage" ? "6%" : RESERVE_HAUT + 60, textAlign: "center", filter: OMBRE }}>
      <Revele taille={140} debut={6}>
        <span style={{ fontSize: 140, fontWeight: 800, textTransform: "uppercase", color: couleurs.clair, letterSpacing: "-0.02em" }}>{morceau.titre}</span>
      </Revele>
      <div style={{ marginTop: 8 }}>
        <Revele taille={44} debut={16}>
          <span style={{ fontSize: 44, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: couleurs.accentSurSombre }}>{morceau.artiste}</span>
        </Revele>
      </div>
    </div>
  );
}

/** La fin : l'artiste, le titre, où l'écouter, et le contact si la déclinaison signe. */
export function CarteDeFin({ morceau, disponible, avecContact }: { morceau: MorceauDuKaraoke; disponible: string; avecContact: boolean }) {
  const couleurs = useCouleurs();
  const { contact } = useMarque();
  const format = useFormat();
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: format === "paysage" ? "6%" : RESERVE_HAUT + 60, textAlign: "center", filter: OMBRE }}>
      <Revele taille={110} debut={0}>
        <span style={{ fontSize: 110, fontWeight: 800, textTransform: "uppercase", color: couleurs.clair }}>{morceau.artiste}</span>
      </Revele>
      <div style={{ marginTop: 6 }}>
        <Revele taille={40} debut={8}>
          <span style={{ fontSize: 40, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: couleurs.accentSurSombre }}>{morceau.titre}</span>
        </Revele>
      </div>
      <div style={{ marginTop: 28 }}>
        <Revele taille={34} debut={18}>
          <span style={{ fontSize: 34, color: couleurs.clairSecondaire }}>{disponible}</span>
        </Revele>
      </div>
      {avecContact ? <div style={{ marginTop: 14, fontSize: 26, color: couleurs.clairLibelle }}>{contact}</div> : null}
    </div>
  );
}
