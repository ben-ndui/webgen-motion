"use client";

import "./reglages.css";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRight, Check, X } from "lucide-react";

import { type Reglage, optionnelsAProposer, reglagesManquants } from "@/lib/reglages/etat-des-reglages";

import InstallerLeCalage from "./installer-le-calage";

type Props = { reglages: Reglage[]; fermer: () => void };

/**
 * « Prépare ton studio » : après une installation ou une mise à jour, ce
 * qu'il manque pour tout faire, ce que chaque réglage débloque, et un
 * bouton qui ouvre la bonne page. GEN MOTION tourne avec les comptes de la
 * personne : il ne peut rien régler à sa place.
 */
export default function PrepareTonStudio({ reglages, fermer }: Props) {
  const fenetre = useRef<HTMLDivElement>(null);
  const manquants = reglagesManquants(reglages).length;
  const optionnels = optionnelsAProposer(reglages).length;

  useEffect(() => {
    fenetre.current?.focus();
    const auClavier = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer();
    };
    window.addEventListener("keydown", auClavier);
    return () => window.removeEventListener("keydown", auClavier);
  }, [fermer]);

  return (
    <div className="reglages-fond" onClick={fermer}>
      <div
        ref={fenetre}
        className="reglages-fenetre"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reglages-titre"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        data-wm-id="hub.reglages.fenetre"
      >
        <header className="reglages-entete">
          <div>
            <p className="reglages-surtitre">Avant de commencer</p>
            <h2 id="reglages-titre" className="reglages-titre">Prépare ton studio</h2>
          </div>
          <button type="button" className="reglages-icone" onClick={fermer} aria-label="Fermer">
            <X aria-hidden />
          </button>
        </header>
        <p className="reglages-texte">
          GEN MOTION travaille avec tes propres comptes : chaque service te facture directement, sans marge.{" "}
          {manquants === 0 ? "Tout est réglé." : `Il te manque ${manquants} réglage${manquants > 1 ? "s" : ""}.`}
        </p>

        <ul className="reglages-liste">
          {reglages.map((reglage) => (
            <li key={reglage.cle} className="reglages-ligne" data-pret={reglage.pret}>
              <span className="reglages-pastille" aria-hidden>{reglage.pret && <Check />}</span>
              <span className="reglages-ligne-texte">
                <span className="reglages-ligne-titre">
                  {reglage.titre}
                  <span className="sr-only">{reglage.pret ? " : prêt" : " : à régler"}</span>
                </span>
                <span className="reglages-ligne-detail">{reglage.debloque}</span>
              </span>
              {reglage.pret ? (
                <span className="reglages-pret">Prêt</span>
              ) : reglage.cle === "karaoke" ? (
                <InstallerLeCalage />
              ) : (
                <Link href={reglage.page} className="reglages-bouton">
                  Régler
                  <ArrowRight aria-hidden />
                </Link>
              )}
            </li>
          ))}
        </ul>

        <footer className="reglages-pied">
          <button type="button" className="reglages-plus-tard" onClick={fermer}>
            {manquants === 0 && optionnels === 0 ? "Fermer" : "Plus tard"}
          </button>
        </footer>
      </div>
    </div>
  );
}
