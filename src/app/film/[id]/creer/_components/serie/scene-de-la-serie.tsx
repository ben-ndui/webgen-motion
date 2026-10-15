"use client";

import { useState } from "react";

import { ajouterUnPlan, retirerUnPlan } from "@/lib/cinema/edition-serie";
import { EXEMPLES_DE_SERIE } from "../../../../../../../remotion/film/cinema/exemples";
import type { CinemaDuFilm, PlanDeCinema, SceneDeCinema } from "../../../../../../../remotion/film/cinema/types";
import { PLANS_PAR_SCENE } from "../../../../../../../remotion/film/cinema/validerCinema";
import AideDeClaude, { type GesteDeClaude } from "./aide-de-claude";
import EditeurDuPlan from "./editeur-du-plan";
import { episodeDeLaScene, useAssistant } from "./use-assistant";
import type { SuiviDUnPlan } from "./use-suivi-des-plans";
import VignetteDuPlan from "./vignette-du-plan";
import ZoneTexte from "./zone-texte";

type Props = {
  filmId: string;
  cinema: CinemaDuFilm;
  scene: SceneDeCinema;
  numero: number;
  suivis: Record<string, SuiviDUnPlan>;
  versionsDesPlans: Record<string, number>;
  blocage: string | null;
  modifierLaSerie: (changement: (cinema: CinemaDuFilm) => void) => void;
  onGenerer: (planId: string) => void;
};

/**
 * Une scène : son décor, puis sa pellicule, les plans en images 9:16 dans
 * l'ordre où ils passeront. Un clic sur un plan l'ouvre en dessous.
 */
export default function SceneDeLaSerie({ filmId, cinema, scene, numero, suivis, versionsDesPlans, blocage, modifierLaSerie, onGenerer }: Props) {
  const [choisi, setChoisi] = useState(scene.plans[0]?.id ?? "");
  const plan = scene.plans.find((p) => p.id === choisi) ?? scene.plans[0];
  const numeroDuPlan = plan ? scene.plans.indexOf(plan) + 1 : 0;

  const modifierLaScene = (changement: (scene: SceneDeCinema) => void) =>
    modifierLaSerie((c) => {
      const copie = c.episodes.flatMap((e) => e.scenes).find((s) => s.id === scene.id);
      if (copie) changement(copie);
    });
  const modifierLePlan = (planId: string) => (changement: (plan: PlanDeCinema) => void) =>
    modifierLaScene((s) => {
      const copie = s.plans.find((p) => p.id === planId);
      if (copie) changement(copie);
    });
  const assistant = useAssistant(filmId, cinema, modifierLaSerie);
  const episode = episodeDeLaScene(cinema, scene.id);
  const gestes: GesteDeClaude[] = [];
  if (scene.plans.some((p) => p.personnages.length > 0)) gestes.push({ libelle: "Écrire les dialogues de la scène", demande: { type: "dialogues", episode, scene: scene.id } });
  if (scene.plans.length < PLANS_PAR_SCENE.max) gestes.push({ libelle: "Proposer le plan suivant", demande: { type: "plan-suivant", episode, scene: scene.id } });
  // Le plan suivant gardé s'ouvre tout de suite dans l'éditeur.
  const garder = () => assistant.garder((c) => setChoisi(c.episodes.flatMap((e) => e.scenes).find((s) => s.id === scene.id)?.plans.at(-1)?.id ?? choisi));
  const nomsDe = (p: PlanDeCinema) => cinema.personnages.filter((personnage) => p.personnages.includes(personnage.id)).map((personnage) => personnage.nom);

  return (
    <section className="bloc scene" aria-label={`Scène ${numero}`}>
      <h3 className="bloc-titre">Scène {numero}</h3>
      <ZoneTexte
        question="Où se passe la scène ?"
        aide="Le lieu et la lumière, en anglais. Répétés dans chaque plan : c'est ce qui garde le même décor."
        exemple={EXEMPLES_DE_SERIE.decor}
        valeur={scene.decor}
        max={800}
        onChange={(valeur) => modifierLaScene((s) => void (s.decor = valeur))}
      />
      <ol className="pellicule" aria-label={`Plans de la scène ${numero}`}>
        {scene.plans.map((p, index) => (
          <VignetteDuPlan key={p.id} filmId={filmId} numero={index + 1} plan={p} suivi={suivis[p.id]} version={versionsDesPlans[p.id] ?? 0} noms={nomsDe(p)} choisi={p.id === plan?.id} onChoisir={() => setChoisi(p.id)} />
        ))}
        {scene.plans.length < PLANS_PAR_SCENE.max && (
          <li>
            <button
              type="button"
              className="vignette vignette-ajout"
              onClick={() => {
                // L'id du nouveau plan n'est connu qu'après l'ajout : on le relit dans la copie.
                modifierLaSerie((c) => {
                  ajouterUnPlan(c, scene.id);
                  const ajoute = c.episodes.flatMap((e) => e.scenes).find((s) => s.id === scene.id)?.plans.at(-1);
                  if (ajoute) setChoisi(ajoute.id);
                });
              }}
            >
              <span className="vignette-image">Ajouter un plan</span>
            </button>
          </li>
        )}
      </ol>
      <AideDeClaude cinema={cinema} gestes={gestes} etat={assistant.etat} demander={(d) => void assistant.demander(d)} garder={garder} refuser={assistant.refuser} autre={assistant.autre} />
      {plan && (
        <EditeurDuPlan
          key={plan.id}
          cinema={cinema}
          scene={scene}
          plan={plan}
          numero={numeroDuPlan}
          suivi={suivis[plan.id]}
          version={versionsDesPlans[plan.id] ?? 0}
          filmId={filmId}
          blocage={blocage}
          modifierLePlan={modifierLePlan(plan.id)}
          modifierLaSerie={modifierLaSerie}
          onGenerer={() => onGenerer(plan.id)}
          onRetirer={() => modifierLaSerie((c) => retirerUnPlan(c, plan.id))}
        />
      )}
    </section>
  );
}
