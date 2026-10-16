import type { ReactNode } from "react";
import Link from "next/link";

import "./barre-flottante.css";

type OngletCommun = { cle: string; libelle: string; icone: ReactNode; pastille?: boolean; titre?: string };
/** Un onglet mène à une page (`href`) ou ouvre quelque chose sur place (`action`). */
export type OngletDeLaBarre =
  | (OngletCommun & { href: string; actif?: boolean })
  | (OngletCommun & { action: () => void; enfonce?: boolean });

function Contenu({ onglet }: { onglet: OngletDeLaBarre }) {
  return (
    <>
      <span className="icone">
        {onglet.icone}
        {onglet.pastille && <span className="pastille" aria-hidden />}
      </span>
      <span>{onglet.libelle}</span>
    </>
  );
}

/**
 * La navigation de la maison : une barre flottante en bas, jamais de barre
 * latérale (doctrine du 29/09/2026). Jusqu'à quatre onglets, chacun avec son
 * libellé sous l'icône ; l'actif en bleu. Le contenu de la page garde une
 * réserve en bas pour ne jamais passer dessous.
 */
export default function BarreFlottante({ libelle, onglets }: { libelle: string; onglets: OngletDeLaBarre[] }) {
  return (
    <nav className="barre-flottante" aria-label={libelle} data-wm-id="nav.barre-flottante">
      <ul>
        {onglets.map((onglet) => (
          <li key={onglet.cle}>
            {"href" in onglet ? (
              <Link href={onglet.href} aria-current={onglet.actif ? "page" : undefined} title={onglet.titre}>
                <Contenu onglet={onglet} />
              </Link>
            ) : (
              <button type="button" onClick={onglet.action} aria-pressed={onglet.enfonce ?? false} title={onglet.titre} data-wm-id={`nav.${onglet.cle}`}>
                <Contenu onglet={onglet} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
