"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

import { NOM_DU_TYPE, type TypeDeReference } from "@/lib/cinema/bible/etat";
// .remplissage-icone (bouton fermer) vient de là : même geste, même style,
// pas de troisième variante de bouton rond pour une icône.
import "../remplissage/remplissage.css";

type Props = {
  type: TypeDeReference;
  nom: string;
  fermer: () => void;
  children: React.ReactNode;
};

/**
 * La fenêtre ouverte depuis une tuile de la bible : mêmes conventions que
 * FenetreDuRemplissage (fond cliquable, Échap, focus au montage), avec le
 * contenu complet d'une référence (CarteDeReference) dedans.
 */
export default function FenetreDeReference({ type, nom, fermer, children }: Props) {
  const fenetre = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fenetre.current?.focus();
  }, []);

  useEffect(() => {
    const auClavier = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer();
    };
    window.addEventListener("keydown", auClavier);
    return () => window.removeEventListener("keydown", auClavier);
  }, [fermer]);

  return (
    <div className="reference-fond" onClick={fermer}>
      <div
        ref={fenetre}
        className="reference-fenetre"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reference-fenetre-titre"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        data-wm-id="serie.reference.fenetre"
      >
        <header className="reference-fenetre-entete">
          <h2 id="reference-fenetre-titre" className="reference-fenetre-titre">
            <span className="reference-bible-type">{NOM_DU_TYPE[type]}</span> {nom}
          </h2>
          <button type="button" className="remplissage-icone" onClick={fermer} aria-label="Fermer">
            <X aria-hidden />
          </button>
        </header>
        <div className="reference-fenetre-corps">{children}</div>
      </div>
    </div>
  );
}
