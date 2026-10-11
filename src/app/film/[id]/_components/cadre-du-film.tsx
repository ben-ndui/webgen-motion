import "../../../editor.css";
import "../../film.css";
import type { ReactNode } from "react";

import AppTopBar from "../../../_components/app-top-bar";

type Props = { nom: string; meta?: ReactNode; children: ReactNode };

/**
 * Le cadre commun aux états de la page d'un film (chargement, erreur,
 * introuvable, invalide, valide) : la barre du haut de l'éditeur de tour et
 * son panneau, pour que la page parle la même langue que le reste de l'app.
 */
export default function CadreDuFilm({ nom, meta, children }: Props) {
  return (
    <div className="min-h-screen flex flex-col">
      <AppTopBar fil={[{ libelle: "Films", href: "/dashboard#films" }, { libelle: nom }]} meta={meta} />
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 lg:px-8 py-6">
        <div className="gm-editor gm-film" data-wm-id="film.page">
          <div className="panel">{children}</div>
        </div>
      </main>
    </div>
  );
}

type PropsEnTete = { id: string; titre: string; sousTitre: string; statut?: ReactNode };

export function EnTeteDuFilm({ id, titre, sousTitre, statut }: PropsEnTete) {
  return (
    <div className="panel-head">
      <div>
        <span className="kicker">Film de marque · films/{id}.json</span>
        <h1 className="panel-title">{titre}</h1>
        <p className="panel-sub">{sousTitre}</p>
      </div>
      {statut}
    </div>
  );
}
