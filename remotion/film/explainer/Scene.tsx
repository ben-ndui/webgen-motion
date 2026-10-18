import { AbsoluteFill } from "remotion";

import { DecorDeDirection } from "../composants/DecorDeDirection";
import { transparence } from "../marque/couleurs";
import { useMarque, useSurface } from "../marque/MarqueDuFilm";
import { useFormat } from "../lib/format";
import { imageDuTemps } from "../lib/tempo";
import { Encadre } from "./composants/Encadre";
import { Pastille } from "./composants/Pastille";
import { MISES_EN_PAGE } from "./miseEnPage";
import { SCENE } from "./rythme";
import type { SceneDeLExplainer, TextesDeScene } from "./spec";
import { Chiffre } from "./visuels/Chiffre";
import { Liste } from "./visuels/Liste";
import { Opposition } from "./visuels/Opposition";
import { Phrase } from "./visuels/Phrase";
import { Tampon } from "./visuels/Tampon";

type Props = { scene: SceneDeLExplainer; textes: TextesDeScene; tempo: number };

/**
 * Une scène : la pastille de chapitre en haut, le visuel au centre, l'encadré
 * en bas (sauf pour la phrase finale, qui est elle-même le texte).
 */
export function Scene({ scene, textes, tempo }: Props) {
  const surface = useSurface("sombre");
  const { couleurs } = useMarque();
  const miseEnPage = MISES_EN_PAGE[useFormat()];
  const temps = (n: number) => imageDuTemps(n, tempo);
  return (
    <AbsoluteFill style={{ background: surface.fond }}>
      <DecorDeDirection surface={surface} />
      <Pastille texte={textes.chapitre} debut={temps(SCENE.pastille)} haut={miseEnPage.pastilleHaut} />
      <div
        style={{
          position: "absolute",
          top: miseEnPage.visuelHaut,
          height: miseEnPage.visuelBas - miseEnPage.visuelHaut,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // Un halo de l'accent derrière le visuel : de la profondeur, sans teinte inventée.
          background: `radial-gradient(ellipse 45% 55% at 50% 50%, ${transparence(couleurs.accent, 0.16)}, transparent 70%)`,
        }}
      >
        <Visuel scene={scene} textes={textes} tempo={tempo} />
      </div>
      {textes.sousTitre && textes.mots.type !== "phrase" ? (
        <Encadre
          sousTitre={textes.sousTitre}
          precision={textes.precision}
          debut={temps(SCENE.sousTitre)}
          debutPrecision={temps(SCENE.precision)}
          miseEnPage={miseEnPage}
        />
      ) : null}
    </AbsoluteFill>
  );
}

/** Le visuel de la scène, avec ses mots. La validation garantit que leurs types concordent. */
function Visuel({ scene, textes, tempo }: Props) {
  const miseEnPage = MISES_EN_PAGE[useFormat()];
  const { visuel } = scene;
  const mots = textes.mots;
  if (visuel.type === "chiffre" && mots.type === "chiffre") {
    return <Chiffre picto={visuel.picto} valeur={mots.valeur} tempo={tempo} miseEnPage={miseEnPage} />;
  }
  if (visuel.type === "opposition" && mots.type === "opposition") {
    return (
      <Opposition pictos={visuel} gauche={mots.gauche} droite={mots.droite} tempo={tempo} miseEnPage={miseEnPage} />
    );
  }
  if (visuel.type === "tampon" && mots.type === "tampon") {
    return <Tampon picto={visuel.picto} tampon={mots.tampon} tempo={tempo} miseEnPage={miseEnPage} />;
  }
  if (visuel.type === "liste" && mots.type === "liste") {
    return <Liste elements={mots.elements} tempo={tempo} miseEnPage={miseEnPage} />;
  }
  if (visuel.type === "phrase" && mots.type === "phrase") {
    return <Phrase picto={visuel.picto} phrase={mots.phrase} motFort={mots.motFort} tempo={tempo} miseEnPage={miseEnPage} />;
  }
  throw new Error(`Scène « ${scene.id} » : visuel « ${visuel.type} » et mots « ${mots.type} » ne concordent pas.`);
}
