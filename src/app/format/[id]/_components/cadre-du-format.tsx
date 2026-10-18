import "../../../editor.css";
import "../../../film/film.css";
import type { ReactNode } from "react";

import AppTopBar from "../../../_components/app-top-bar";

type Props = { nom: string; kicker: string; titre: string; sousTitre: string; statut?: ReactNode; children: ReactNode };

/**
 * Le cadre de la page d'un projet de format : la même barre du haut, le même
 * panneau et les mêmes cartes que la page d'un film (editor.css, film.css),
 * pour que la page parle la langue du reste de l'app.
 */
export default function CadreDuFormat({ nom, kicker, titre, sousTitre, statut, children }: Props) {
  return (
    <div className="min-h-screen flex flex-col">
      <AppTopBar fil={[{ libelle: "Formats", href: "/dashboard#formats" }, { libelle: nom }]} />
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 lg:px-8 py-6">
        <div className="gm-editor gm-film" data-wm-id="format.page">
          <div className="panel">
            <div className="panel-head">
              <div>
                <span className="kicker">{kicker}</span>
                <h1 className="panel-title">{titre}</h1>
                <p className="panel-sub">{sousTitre}</p>
              </div>
              {statut}
            </div>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
