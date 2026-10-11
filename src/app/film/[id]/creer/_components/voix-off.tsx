"use client";

import { useState } from "react";

import { type PlanParle, lignesDeDepart, phraseDeDepart, tempsDeParole } from "@/lib/film-voix-plans";
import type { FilmSpec, Langue, LigneDeVoix } from "../../../../../../remotion/film/spec";
import LigneDeVoixOff from "./ligne-de-voix";

const PLANS: { id: PlanParle; titre: string }[] = [
  { id: "ouverture", titre: "L'ouverture (ton logo)" },
  { id: "probleme", titre: "Le problème (la conversation)" },
  { id: "bascule", titre: "La bascule" },
  { id: "parcours", titre: "Le parcours" },
  { id: "evenement", titre: "Le moment clé" },
  { id: "marque", titre: "Tes trois mots" },
  { id: "fin", titre: "La fin" },
];

type Props = {
  id: string;
  fiche: FilmSpec;
  langues: Langue[];
  modifier: (changement: (copie: FilmSpec) => void) => void;
  enregistrer: () => Promise<boolean>;
  recharger: () => Promise<void>;
};

/**
 * La voix off du film : une phrase par plan, pré-remplie avec ce que le plan
 * affiche, générée avec la voix réglée dans GEN MOTION. Changer un texte
 * oblige à régénérer sa voix (l'ancienne ne correspondrait plus).
 */
export default function VoixOff({ id, fiche, langues, modifier, enregistrer, recharger }: Props) {
  const [langue, setLangue] = useState<Langue>(langues[0] ?? "fr");
  const [generation, setGeneration] = useState<{ enCours: boolean; message: string | null; erreurs: string[] }>({ enCours: false, message: null, erreurs: [] });
  const temps = tempsDeParole(fiche);
  const lignes = fiche.voix?.lignes[langue] ?? [];
  // Seules comptent les phrases des plans montés : les autres ne sont ni montrées ni jouées.
  const aGenerer = langues.reduce((n, l) => n + (fiche.voix?.lignes[l] ?? []).filter((ligne) => !ligne.fichier && temps[ligne.plan as PlanParle] !== undefined).length, 0);

  const ecrireLigne = (plan: string, changement: (ligne: LigneDeVoix | undefined, liste: LigneDeVoix[]) => void) =>
    modifier((c) => {
      if (!c.voix) return;
      const liste = c.voix.lignes[langue] ?? (c.voix.lignes[langue] = []);
      changement(liste.find((l) => l.plan === plan), liste);
    });

  async function generer() {
    setGeneration({ enCours: true, message: null, erreurs: [] });
    if (!(await enregistrer())) return setGeneration({ enCours: false, message: "Enregistrement impossible, réessaie.", erreurs: [] });
    try {
      const reponse = await fetch(`/api/motion/film/${id}/voix`, { method: "POST" });
      const corps = (await reponse.json().catch(() => ({}))) as { generees?: number; erreurs?: string[]; erreur?: string };
      await recharger();
      if (!reponse.ok) return setGeneration({ enCours: false, message: corps.erreur ?? "La génération a échoué.", erreurs: [] });
      setGeneration({ enCours: false, message: `${corps.generees ?? 0} voix générée${(corps.generees ?? 0) > 1 ? "s" : ""}.`, erreurs: corps.erreurs ?? [] });
    } catch {
      setGeneration({ enCours: false, message: "GEN MOTION ne répond pas.", erreurs: [] });
    }
  }

  if (!fiche.voix) {
    return (
      <section className="bloc" aria-labelledby="bloc-voix">
        <h3 id="bloc-voix" className="bloc-titre">Ta voix off</h3>
        <p className="champ-aide">Une voix lit une phrase sur chaque plan, et la musique baisse toute seule pendant qu&apos;elle parle. On part des textes déjà à l&apos;écran : tu les ajustes ensuite.</p>
        <button type="button" className="film-btn" onClick={() => modifier((c) => {
          c.voix = { musiqueSousLaVoix: 0.3, lignes: { fr: [], en: [] } };
          for (const l of langues) c.voix.lignes[l] = lignesDeDepart(c, l);
        })}>Ajouter une voix off</button>
      </section>
    );
  }

  return (
    <section className="bloc" aria-labelledby="bloc-voix">
      <h3 id="bloc-voix" className="bloc-titre">Ta voix off</h3>
      {langues.length > 1 && (
        <div className="langues" role="tablist" aria-label="Langue de la voix">
          {langues.map((l) => (
            <button key={l} type="button" role="tab" aria-selected={l === langue} className={l === langue ? "actif" : ""} onClick={() => setLangue(l)}>
              Voix en {l === "fr" ? "français" : "anglais"}
            </button>
          ))}
        </div>
      )}
      {PLANS.filter((plan) => temps[plan.id] !== undefined).map((plan) => {
        const ligne = lignes.find((l) => l.plan === plan.id);
        if (!ligne) {
          return (
            <button key={plan.id} type="button" className="lien" onClick={() => ecrireLigne(plan.id, (_, liste) => liste.push({ plan: plan.id, texte: phraseDeDepart(fiche, langue, plan.id) || "…" }))}>
              + Une phrase sur « {plan.titre} »
            </button>
          );
        }
        return (
          <LigneDeVoixOff
            key={plan.id}
            titre={plan.titre}
            ligne={ligne}
            disponible={temps[plan.id]}
            onTexte={(texte) => ecrireLigne(plan.id, (l) => { if (l) { l.texte = texte; delete l.fichier; delete l.duree; } })}
            onRetirer={() => ecrireLigne(plan.id, (_, liste) => { liste.splice(liste.findIndex((l) => l.plan === plan.id), 1); })}
          />
        );
      })}
      <label className="champ">
        <span className="champ-question">Volume de la musique pendant la voix : {Math.round(fiche.voix.musiqueSousLaVoix * 100)} %</span>
        <input type="range" min={0} max={100} value={Math.round(fiche.voix.musiqueSousLaVoix * 100)} onChange={(e) => modifier((c) => { if (c.voix) c.voix.musiqueSousLaVoix = Number(e.target.value) / 100; })} />
      </label>
      <div className="ecrans-actions">
        <button type="button" className="film-btn" disabled={generation.enCours || aGenerer === 0} onClick={() => void generer()}>
          {generation.enCours ? "Génération…" : aGenerer > 0 ? `Générer les voix (${aGenerer})` : "Voix à jour"}
        </button>
        <button type="button" className="lien" onClick={() => modifier((c) => { delete c.voix; })}>Retirer la voix off</button>
      </div>
      {generation.message && <p className="champ-aide" role="status">{generation.message}</p>}
      {generation.erreurs.map((erreur) => <p key={erreur} className="depot-erreur" role="alert">{erreur}</p>)}
    </section>
  );
}
