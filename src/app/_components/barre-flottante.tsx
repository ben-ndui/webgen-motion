import type { ReactNode } from "react";
import Link from "next/link";

import "./barre-flottante.css";

export type OngletDeLaBarre = { cle: string; libelle: string; icone: ReactNode; href: string; actif?: boolean };

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
            <Link href={onglet.href} aria-current={onglet.actif ? "page" : undefined}>
              {onglet.icone}
              <span>{onglet.libelle}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
