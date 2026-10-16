import type { PointerEvent, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AppWindow, List, PictureInPicture2, X } from "lucide-react";

import TitreDeLaConsole, { BoutonDeLaConsole } from "./titre-de-la-console";

type Props = {
  surface: ReactNode;
  hauteur: number;
  tirage: boolean;
  tirer: (e: PointerEvent) => void;
  enDirect: boolean;
  avis: string | null;
  compact: boolean;
  basculerCompact: () => void;
  rendreFlottante: () => void;
  ouvrirLaFenetre: () => void;
  fermer: () => void;
};

/**
 * La console ouverte prend la place de la barre de navigation : une feuille
 * flottante en bas (décollée des bords, quatre coins arrondis, 85 % de
 * l'écran au plus), la saisie sous le pouce. Fermer ramène la barre.
 */
export default function FeuilleDeLaConsole(props: Props) {
  const reduit = useReducedMotion();
  return (
    <motion.section
      className="gm-hubconsole-feuille"
      aria-label="Console IA"
      style={{ height: props.hauteur }}
      initial={reduit ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
      data-wm-id="console.hub.feuille"
    >
      <button
        type="button"
        className={"hc-poignee" + (props.tirage ? " dragging" : "")}
        onPointerDown={props.tirer}
        aria-label="Agrandir ou réduire la console"
        data-wm-id="console.hub.resize"
      />
      <div className="hc-feuille-head">
        <TitreDeLaConsole enDirect={props.enDirect} avis={props.avis}>
          <BoutonDeLaConsole titre="Historique compact" actif={props.compact} onClick={props.basculerCompact} wmId="console.hub.compact-toggle">
            <List />
          </BoutonDeLaConsole>
          <BoutonDeLaConsole titre="Détacher en fenêtre flottante" onClick={props.rendreFlottante} wmId="console.hub.detach">
            <PictureInPicture2 />
          </BoutonDeLaConsole>
          <BoutonDeLaConsole titre="Ouvrir dans une fenêtre séparée" onClick={props.ouvrirLaFenetre} wmId="console.hub.window">
            <AppWindow />
          </BoutonDeLaConsole>
          <BoutonDeLaConsole titre="Fermer la console (Échap)" onClick={props.fermer} wmId="console.hub.close">
            <X />
          </BoutonDeLaConsole>
        </TitreDeLaConsole>
      </div>
      <div className="hc-feuille-body">{props.surface}</div>
    </motion.section>
  );
}
