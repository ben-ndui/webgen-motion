import type { ReactNode } from "react";

type Props = {
  enDirect: boolean;
  avis: string | null;
  children: ReactNode; // les boutons, à droite
};

/** La ligne de titre de la console (feuille ou flottante) : état, avis passager, boutons. */
export default function TitreDeLaConsole({ enDirect, avis, children }: Props) {
  return (
    <>
      <span className={"hc-dot" + (enDirect ? " live" : "")} aria-hidden />
      <span className="hc-title">console</span>
      <span>· studio</span>
      {avis && (
        <span className="hc-note" role="status">
          {avis}
        </span>
      )}
      <span className="hc-actions">{children}</span>
    </>
  );
}

type PropsDuBouton = { titre: string; actif?: boolean; onClick: () => void; wmId: string; children: ReactNode };

export function BoutonDeLaConsole({ titre, actif, onClick, wmId, children }: PropsDuBouton) {
  return (
    <button
      type="button"
      className={"hc-btn" + (actif ? " on" : "")}
      title={titre}
      aria-label={titre}
      aria-pressed={actif}
      onClick={onClick}
      data-wm-id={wmId}
    >
      {children}
    </button>
  );
}
