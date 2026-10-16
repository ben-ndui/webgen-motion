import { Revele } from "../../composants/Revele";
import { useCouleurs, useMarque } from "../../marque/MarqueDuFilm";
import type { Format } from "../../lib/format";
import { MARGE_PORTRAIT } from "../../lib/format";
import { imageDuTemps } from "../../lib/tempo";
import type { TextesDuConte } from "../spec";
import { AVANT, AVANTAGE, CONSTAT, FIN, SAUF, SCENES, SOLUTION } from "../trame";

type Props = { plan: string; textes: TextesDuConte; format: Format; tempo: number; avecContact: boolean };

/** Les mots d'un plan, en haut et au centre : chaque ligne monte à son temps (trame.ts). */
export function TextesDuPlan({ plan, textes, format, tempo, avecContact }: Props) {
  const couleurs = useCouleurs();
  const { contact } = useMarque();
  const t = (n: number) => imageDuTemps(n, tempo);
  const echelle = format === "paysage" ? 1 : 0.85;
  const ligne = (texte: string, taille: number, debut: number, couleur: string, graisse = 600) => (
    <div style={{ marginTop: 10 }}>
      <Revele taille={taille * echelle} debut={debut}>
        <span style={{ fontSize: taille * echelle, fontWeight: graisse, lineHeight: 1.12, color: couleur }}>{texte}</span>
      </Revele>
    </div>
  );
  const contenu = (() => {
    if (plan === "avant") {
      return [
        ligne(textes.epoque.toUpperCase(), 24, t(AVANT.epoque), couleurs.accentSurSombre, 600),
        ligne(textes.avant, 64, t(AVANT.titre), couleurs.clair),
        ligne(textes.avantDetail, 34, t(AVANT.detail), couleurs.clairSecondaire, 400),
      ];
    }
    if (plan === "chute") return [ligne(textes.chute, 60, 0, couleurs.clair)];
    if (plan === "constat") {
      return [ligne(textes.constat, 44, t(CONSTAT.titre), couleurs.clair, 500), ligne(textes.constatChiffre, 72, t(CONSTAT.chiffre), couleurs.accentSurSombre, 700)];
    }
    if (plan === "sauf") return [ligne(textes.sauf, 120, t(SAUF.titre), couleurs.clair, 700)];
    if (plan === "solution") {
      return [ligne(textes.nom, 110, t(SOLUTION.nom), couleurs.accentSurSombre, 700), ligne(textes.promesse, 44, t(SOLUTION.promesse), couleurs.clair, 500)];
    }
    if (plan.startsWith("avantage-")) {
      const index = Number(plan.slice("avantage-".length));
      return [ligne(textes.avantages[index] ?? "", 60, t(AVANTAGE.titre), couleurs.clair)];
    }
    if (plan === "fin") {
      return [
        ligne(textes.nom, 96, 0, couleurs.clair, 700),
        <div key="adresse" style={{ marginTop: 24 }}>
          <Revele taille={36} debut={t(FIN.adresse)}>
            <span style={{ display: "inline-block", padding: "10px 28px", borderRadius: 999, background: couleurs.accent, color: couleurs.clair, fontSize: 36 * echelle, fontWeight: 600 }}>
              {textes.adresse}
            </span>
          </Revele>
        </div>,
        avecContact && contact !== textes.adresse ? ligne(contact, 28, t(FIN.adresse + 1), couleurs.clairLibelle, 400) : null,
      ];
    }
    return [];
  })();
  return (
    <div
      style={{
        position: "absolute",
        top: SCENES[format].titres,
        left: format === "paysage" ? 360 : MARGE_PORTRAIT,
        right: format === "paysage" ? 360 : MARGE_PORTRAIT,
        textAlign: "center",
      }}
    >
      {contenu.map((element, index) => (
        <div key={index}>{element}</div>
      ))}
    </div>
  );
}
