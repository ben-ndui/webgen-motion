import "./remplissage.css";
import { useEffect, useRef } from "react";
import { Minimize2, X } from "lucide-react";

import { ETAPES_DU_REMPLISSAGE, etatsDesEtapes } from "@/lib/site/etapes-du-remplissage";

import type { EtatDuRemplissage } from "../use-remplissage";
import type { Destination } from "./a-faire-apres";
import ApercusEnDirect from "./apercus-en-direct";
import FriseDesEtapes from "./frise-des-etapes";
import RecapDuRemplissage from "./recap-du-remplissage";

type Props = {
  id: string;
  site: string;
  etat: Exclude<EtatDuRemplissage, { type: "repos" }>;
  reduire: () => void;
  fermer: () => void;
  arreter: () => void;
  reessayer: () => void;
  onAller: (destination: Destination) => void;
};

const TITRES = { "en-cours": "GEN MOTION lit ton site", fait: "C'est rempli", erreur: "Le remplissage s'est arrêté" } as const;

/**
 * Le suivi de « Remplir depuis ton site » : les étapes qui se cochent et les
 * captures qui arrivent, puis, dans la même fenêtre, le récap de ce qu'il
 * reste à faire. Pendant le travail, Échap ou le fond la réduisent dans le
 * coin sans rien arrêter.
 */
export default function FenetreDuRemplissage({ id, site, etat, reduire, fermer, arreter, reessayer, onAller }: Props) {
  const fenetre = useRef<HTMLDivElement>(null);
  const enCours = etat.type === "en-cours";
  const issue = enCours ? "en-cours" : etat.type === "fait" ? "fini" : "echec";
  const rang = ETAPES_DU_REMPLISSAGE.findIndex((e) => e.cle === etat.avancement.etape);
  const progression = issue === "fini" ? 1 : (rang + 0.5) / ETAPES_DU_REMPLISSAGE.length;
  const quitter = enCours ? reduire : fermer;

  useEffect(() => {
    fenetre.current?.focus();
  }, []);

  useEffect(() => {
    const auClavier = (e: KeyboardEvent) => {
      if (e.key === "Escape") quitter();
    };
    window.addEventListener("keydown", auClavier);
    return () => window.removeEventListener("keydown", auClavier);
  }, [quitter]);

  return (
    <div className="remplissage-fond" onClick={quitter}>
      <div
        ref={fenetre}
        className="remplissage-fenetre"
        role="dialog"
        aria-modal="true"
        aria-labelledby="remplissage-titre"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        data-etat={etat.type}
        data-wm-id="film.remplir.fenetre"
      >
        <span className="remplissage-barre" style={{ transform: `scaleX(${progression})` }} aria-hidden />
        <header className="remplissage-entete">
          <div>
            <p className="remplissage-surtitre">Remplir depuis {site}</p>
            <h2 id="remplissage-titre" className="remplissage-titre">{TITRES[etat.type]}</h2>
          </div>
          <button type="button" className="remplissage-icone" onClick={quitter} aria-label={enCours ? "Réduire dans le coin" : "Fermer"} title={enCours ? "Réduire dans le coin (Échap)" : "Fermer"}>
            {enCours ? <Minimize2 aria-hidden /> : <X aria-hidden />}
          </button>
        </header>

        <ApercusEnDirect id={id} numeros={etat.avancement.apercus} enCours={enCours} />

        {etat.type === "fait" ? (
          <RecapDuRemplissage resume={etat.resume} onAller={onAller} />
        ) : (
          <FriseDesEtapes etats={etatsDesEtapes(etat.avancement.etape, issue)} detail={enCours ? etat.avancement.detail : null} />
        )}
        {etat.type === "erreur" && <p className="depot-erreur" role="alert">{etat.message}</p>}

        <footer className="remplissage-pied">
          {enCours && <p className="remplissage-astuce">Tu peux réduire cette fenêtre : le remplissage continue.</p>}
          {enCours && <button type="button" className="film-btn film-btn-ghost" onClick={arreter}>Arrêter</button>}
          {enCours && <button type="button" className="film-btn" onClick={reduire}>Réduire</button>}
          {etat.type === "erreur" && <button type="button" className="film-btn film-btn-ghost" onClick={fermer}>Fermer</button>}
          {etat.type === "erreur" && <button type="button" className="film-btn" onClick={reessayer}>Réessayer</button>}
          {etat.type === "fait" && <button type="button" className="film-btn" onClick={fermer}>Fermer</button>}
        </footer>
      </div>
    </div>
  );
}
