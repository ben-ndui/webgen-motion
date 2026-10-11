"use client";

import { useState } from "react";

import { MUSIQUE_SOUS_LA_VOIX } from "@/lib/film-voix-niveaux";
import type { FilmSpec } from "../../../../../../remotion/film/spec";

type Props = {
  id: string;
  fiche: FilmSpec;
  aGenerer: number;
  modifier: (changement: (copie: FilmSpec) => void) => void;
  enregistrer: () => Promise<boolean>;
  recharger: () => Promise<void>;
};

/** Le volume de la musique sous la voix, et le bouton qui génère les répliques en attente. */
export default function GenerationDesVoix({ id, fiche, aGenerer, modifier, enregistrer, recharger }: Props) {
  const [etat, setEtat] = useState<{ enCours: boolean; message: string | null; erreurs: string[] }>({ enCours: false, message: null, erreurs: [] });
  const niveau = Math.round((fiche.voix?.musiqueSousLaVoix ?? MUSIQUE_SOUS_LA_VOIX) * 100);

  async function generer() {
    setEtat({ enCours: true, message: null, erreurs: [] });
    if (!(await enregistrer())) return setEtat({ enCours: false, message: "Enregistrement impossible, réessaie.", erreurs: [] });
    try {
      const reponse = await fetch(`/api/motion/film/${id}/voix`, { method: "POST" });
      const corps = (await reponse.json().catch(() => ({}))) as { generees?: number; erreurs?: string[]; erreur?: string };
      await recharger();
      if (!reponse.ok) return setEtat({ enCours: false, message: corps.erreur ?? "La génération a échoué.", erreurs: [] });
      const n = corps.generees ?? 0;
      setEtat({ enCours: false, message: `${n} réplique${n > 1 ? "s" : ""} générée${n > 1 ? "s" : ""}.`, erreurs: corps.erreurs ?? [] });
    } catch {
      setEtat({ enCours: false, message: "GEN MOTION ne répond pas.", erreurs: [] });
    }
  }

  return (
    <>
      <label className="champ">
        <span className="champ-question">Volume de la musique pendant la voix : {niveau} %</span>
        <input type="range" min={0} max={100} value={niveau} onChange={(e) => modifier((c) => { if (c.voix) c.voix.musiqueSousLaVoix = Number(e.target.value) / 100; })} />
      </label>
      <div className="ecrans-actions">
        <button type="button" className="film-btn" disabled={etat.enCours || aGenerer === 0} onClick={() => void generer()}>
          {etat.enCours ? "Génération…" : aGenerer > 0 ? `Générer les voix (${aGenerer})` : "Voix à jour"}
        </button>
        <button type="button" className="lien" onClick={() => modifier((c) => { delete c.voix; })}>Retirer la voix off</button>
      </div>
      {etat.message && <p className="champ-aide" role="status">{etat.message}</p>}
      {etat.erreurs.map((erreur) => <p key={erreur} className="depot-erreur" role="alert">{erreur}</p>)}
    </>
  );
}
