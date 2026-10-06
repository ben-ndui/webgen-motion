import { useMarque } from "../marque/MarqueDuFilm";
import { imageDuTemps } from "../lib/tempo";
import { Glyphe } from "./Glyphe";
import { MotSymbole } from "./MotSymbole";
import { Revele } from "./Revele";

type Props = {
  // Taille du logo, en px : celle du mot-symbole. Un glyphe et son logotype
  // s'en déduisent, aux proportions du film VAGUA.
  taille: number;
  couleur: string;
  tempo: number;
  // « ouverture » : le logo se pose, un trait par temps. « fin » : il se
  // redessine vite, le spectateur le connaît déjà.
  cadence: "ouverture" | "fin";
};

/**
 * Le logo du film, sous la forme choisie dans la fiche du film (`marque.logo`). Pour
 * une taille de 180 à l'ouverture et 120 à la fin, un glyphe retrouve les
 * mesures du film VAGUA : glyphe 260 et logotype 92 en colonne, puis 150 et
 * 104 en ligne.
 */
export function Logo({ taille, couleur, tempo, cadence }: Props) {
  const temps = (n: number) => imageDuTemps(n, tempo);
  const { logo } = useMarque();
  const ouverture = cadence === "ouverture";

  if (logo.type === "motSymbole") {
    return (
      <MotSymbole
        texte={logo.texte}
        graisse={logo.graisse}
        approche={logo.approche}
        taille={taille}
        couleur={couleur}
        debutMot={0}
        debutFilet={ouverture ? temps(2) : temps(1.5)}
      />
    );
  }

  // Un trait par temps à l'ouverture (le premier décalé de deux images, pour
  // ne pas commencer sur la coupe) ; trois images entre deux traits à la fin.
  const departs = logo.traces.map((_, index) => (ouverture ? temps(index) + (index === 0 ? 2 : 0) : index * 3));
  const tailleDuGlyphe = Math.round(taille * (ouverture ? 1.45 : 1.25));
  const tailleDuLogotype = Math.round(taille * (ouverture ? 0.51 : 0.87));

  return (
    <div
      style={{
        display: "flex",
        flexDirection: ouverture ? "column" : "row",
        alignItems: "center",
        gap: ouverture ? 56 : 44,
      }}
    >
      <Glyphe
        traces={logo.traces}
        taille={tailleDuGlyphe}
        couleur={couleur}
        departs={departs}
        dureeDuTrait={ouverture ? 12 : 9}
      />
      <Revele taille={tailleDuLogotype} debut={ouverture ? temps(logo.traces.length) : temps(1)} duree={ouverture ? 18 : 16}>
        <span
          style={{
            fontWeight: logo.graisseDuLogotype,
            fontSize: tailleDuLogotype,
            letterSpacing: `${logo.espacementDuLogotype}em`,
            color: couleur,
          }}
        >
          {logo.logotype}
        </span>
      </Revele>
    </div>
  );
}
