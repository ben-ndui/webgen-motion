"use client";

import "./reglages.css";

import { useRouter } from "next/navigation";
import { Download } from "lucide-react";

import BarreDeProgression from "@/app/_components/progression/barre-de-progression";
import { MODELE_FRANCAIS } from "@/lib/karaoke-alignement/modele-francais";
import { useTelechargementDeModele } from "@/lib/use-telechargement-de-modele";

const MO = 1_000_000;

/**
 * « Installer maintenant » le modèle du calage mot à mot, sur place : dans
 * « Prépare ton studio » et dans Réglages › Écoute locale. Le téléchargement
 * (356 Mo) est vérifié côté serveur ; une fois fini, la page relit l'état des
 * réglages pour que la ligne passe à « Prêt » partout. Fermer la fenêtre ne
 * l'arrête pas : rouverte, elle dit « en cours » au lieu de proposer un doublon.
 */
export default function InstallerLeCalage({ installe = false, enCours = false }: { installe?: boolean; enCours?: boolean }) {
  const router = useRouter();
  const { etat, telecharger } = useTelechargementDeModele("/api/motion/alignement/telecharger", MODELE_FRANCAIS.octets);

  async function installer() {
    if (await telecharger()) router.refresh();
  }

  if (installe || etat.type === "termine") return <span className="reglages-pret" role="status">Installé</span>;
  if (etat.type === "deja-en-cours" || (enCours && etat.type === "repos")) {
    return <span className="reglages-installation" role="status">Installation en cours : relis cette page dans une minute.</span>;
  }
  if (etat.type === "telechargement") {
    const pourcent = Math.floor((etat.recus / etat.total) * 100);
    return (
      <span className="reglages-installation" role="status">
        <BarreDeProgression valeur={pourcent / 100} nom="Installation du calage mot à mot" />
        <span>{pourcent} % · {Math.round(etat.recus / MO)} / {Math.round(etat.total / MO)} Mo</span>
      </span>
    );
  }
  return (
    <span className="reglages-installation">
      <button type="button" className="reglages-bouton" onClick={() => void installer()} data-wm-id="reglages.installer-calage">
        <Download aria-hidden />
        {etat.type === "erreur" ? "Réessayer" : "Installer maintenant"}
      </button>
      {etat.type === "erreur" && <span className="reglages-installation-erreur" role="alert">{etat.message}</span>}
    </span>
  );
}
