import type { PointerEvent, ReactNode } from "react";
import { AppWindow, List, PanelBottom, X } from "lucide-react";

import TitreDeLaConsole, { BoutonDeLaConsole } from "./titre-de-la-console";
import type { Cadre } from "./use-console-flottante";

type Props = {
  surface: ReactNode;
  cadre: Cadre;
  deplacement: boolean;
  deplacer: (e: PointerEvent) => void;
  redimensionner: (e: PointerEvent) => void;
  enDirect: boolean;
  avis: string | null;
  compact: boolean;
  basculerCompact: () => void;
  ramenerEnBas: () => void;
  ouvrirLaFenetre: () => void;
  fermer: () => void;
};

/** La console en petite fenêtre dans la page, déplaçable : la barre du bas reste là. */
export default function ConsoleFlottante(props: Props) {
  const { cadre } = props;
  return (
    <div
      className="gm-hubconsole-float"
      role="dialog"
      aria-label="Console IA"
      style={{ left: cadre.x, top: cadre.y, width: cadre.w, height: cadre.h }}
      data-wm-id="console.hub.float"
    >
      <div
        className={"hc-float-head" + (props.deplacement ? " dragging" : "")}
        onPointerDown={props.deplacer}
        data-wm-id="console.hub.float.drag"
      >
        <TitreDeLaConsole enDirect={props.enDirect} avis={props.avis}>
          <BoutonDeLaConsole titre="Historique compact" actif={props.compact} onClick={props.basculerCompact} wmId="console.hub.compact-toggle">
            <List />
          </BoutonDeLaConsole>
          <BoutonDeLaConsole titre="Ramener en bas" onClick={props.ramenerEnBas} wmId="console.hub.dock">
            <PanelBottom />
          </BoutonDeLaConsole>
          <BoutonDeLaConsole titre="Ouvrir dans une fenêtre séparée" onClick={props.ouvrirLaFenetre} wmId="console.hub.window">
            <AppWindow />
          </BoutonDeLaConsole>
          <BoutonDeLaConsole titre="Fermer la console" onClick={props.fermer} wmId="console.hub.close">
            <X />
          </BoutonDeLaConsole>
        </TitreDeLaConsole>
      </div>
      <div className="hc-float-body">{props.surface}</div>
      <button
        type="button"
        className="hc-resize-corner"
        onPointerDown={props.redimensionner}
        aria-label="Redimensionner la console"
        data-wm-id="console.hub.float.resize"
      />
    </div>
  );
}
