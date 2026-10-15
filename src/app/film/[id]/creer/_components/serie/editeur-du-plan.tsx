"use client";

import { COUT_D_UN_PLAN_USD, enDollars } from "@/lib/cinema/couts";
import { basculerUnPersonnage } from "@/lib/cinema/edition-serie";
import { choisirLeModele } from "@/lib/cinema/plans";
import { EXEMPLES_DE_SERIE, estUnExemple } from "../../../../../../../remotion/film/cinema/exemples";
import { type CinemaDuFilm, PERSONNAGES_PAR_PLAN_MAX, type PlanDeCinema, type SceneDeCinema } from "../../../../../../../remotion/film/cinema/types";
import { raisonDeNePasGenerer } from "./raison-de-ne-pas-generer";
import type { SuiviDUnPlan } from "./use-suivi-des-plans";
import AideDeClaude, { type GesteDeClaude } from "./aide-de-claude";
import ChampReplique from "./champ-replique";
import ControleDeLaReplique from "./controle-de-la-replique";
import DecoupeDuPlan from "./decoupe-du-plan";
import { episodeDeLaScene, useAssistant } from "./use-assistant";
import ZoneTexte from "./zone-texte";

type Props = {
  filmId: string;
  cinema: CinemaDuFilm;
  scene: SceneDeCinema;
  plan: PlanDeCinema;
  numero: number;
  suivi: SuiviDUnPlan | undefined;
  // Change quand une nouvelle vidéo du plan arrive.
  version: number;
  blocage: string | null;
  modifierLePlan: (changement: (plan: PlanDeCinema) => void) => void;
  // Pour poser une proposition de Claude gardée.
  modifierLaSerie: (changement: (cinema: CinemaDuFilm) => void) => void;
  onGenerer: () => void;
  onRetirer: () => void;
};

const MESSAGES: Partial<Record<SuiviDUnPlan["etat"], string>> = {
  "en-cours": "Google génère ce plan : une à trois minutes. Tu peux continuer à écrire les autres.",
  pret: "Plan prêt.",
};

/** Le plan choisi sur la pellicule : ce qui s'y passe, qui est à l'image, qui parle, et le bouton qui le génère. */
export default function EditeurDuPlan({ filmId, cinema, scene, plan, numero, suivi, version, blocage, modifierLePlan, modifierLaSerie, onGenerer, onRetirer }: Props) {
  const choix = choisirLeModele(cinema, plan);
  const raison = raisonDeNePasGenerer(cinema, scene, plan, suivi, blocage);
  const presents = cinema.personnages.filter((p) => plan.personnages.includes(p.id));
  const message = suivi && "raison" in suivi ? suivi.raison : suivi ? MESSAGES[suivi.etat] : undefined;
  const dejaGenere = suivi?.etat === "pret";
  const assistant = useAssistant(filmId, cinema, modifierLaSerie);
  const episode = episodeDeLaScene(cinema, scene.id);
  const gestes: GesteDeClaude[] = [
    { libelle: estUnExemple("consigne", plan.consigne) ? "Écrire l'action avec Claude" : "Réécrire l'action avec Claude", demande: { type: "consigne", episode, plan: plan.id } },
  ];
  if (presents.length > 0) {
    gestes.push({ libelle: plan.replique ? "Autre réplique avec Claude" : "Écrire la réplique avec Claude", demande: { type: "replique", episode, plan: plan.id } });
  }

  return (
    <section className="bloc editeur-plan" aria-label={`Plan ${numero}`}>
      <h4 className="bloc-titre">Plan {numero}</h4>
      <ZoneTexte
        question="Que se passe-t-il à l'image ?"
        aide="Une ou deux phrases, en anglais. Le décor de la scène et les personnages sont ajoutés tout seuls."
        exemple={EXEMPLES_DE_SERIE.consigne}
        valeur={plan.consigne}
        max={600}
        onChange={(valeur) => modifierLePlan((p) => void (p.consigne = valeur))}
      />

      <fieldset className="champ choix-personnages">
        <legend className="champ-question">Qui est à l&apos;image ?</legend>
        {cinema.personnages.length === 0 && <p className="champ-aide">Personne pour l&apos;instant : ajoute un personnage dans le casting.</p>}
        <div className="puces">
          {cinema.personnages.map((personnage) => {
            const present = plan.personnages.includes(personnage.id);
            const plein = !present && plan.personnages.length >= PERSONNAGES_PAR_PLAN_MAX;
            return (
              <button key={personnage.id} type="button" className="puce" aria-pressed={present} disabled={plein} onClick={() => modifierLePlan((p) => basculerUnPersonnage(p, personnage.id))}>
                {personnage.nom}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="case-a-cocher">
        <input type="checkbox" checked={plan.objet} disabled={!cinema.objet} onChange={(e) => modifierLePlan((p) => void (p.objet = e.target.checked))} />
        <span>L&apos;objet du film est à l&apos;image{cinema.objet ? "" : " (décris-le d'abord, plus haut)"}</span>
      </label>

      {presents.length > 0 && <ChampReplique presents={presents} replique={plan.replique} modifierLePlan={modifierLePlan} />}

      <AideDeClaude cinema={cinema} gestes={gestes} etat={assistant.etat} demander={(d) => void assistant.demander(d)} garder={() => assistant.garder()} refuser={assistant.refuser} autre={assistant.autre} />

      {suivi?.etat === "pret" && plan.replique && <ControleDeLaReplique key={`${version}-${plan.replique.texte}`} filmId={filmId} planId={plan.id} />}
      {suivi?.etat === "pret" && (
        <DecoupeDuPlan key={version} filmId={filmId} plan={plan} fichier={suivi.fichier} version={version} modifierLePlan={modifierLePlan} />
      )}

      <div className="generer">
        <button type="button" className="film-btn" disabled={raison !== null} onClick={onGenerer}>
          {dejaGenere ? "Refaire ce plan" : "Générer ce plan"} ({enDollars(COUT_D_UN_PLAN_USD[choix.qualite])})
        </button>
        <p className="champ-aide">{raison ?? `Veo ${choix.qualite === "fast" ? "Fast" : "Lite"} : ${choix.pourquoi}`}</p>
      </div>
      {message && (
        <p className={suivi?.etat === "refuse" || suivi?.etat === "erreur" ? "depot-erreur" : "champ-aide"} role={suivi?.etat === "refuse" || suivi?.etat === "erreur" ? "alert" : "status"}>
          {message}
        </p>
      )}
      <button type="button" className="lien" onClick={onRetirer}>
        Retirer ce plan{dejaGenere ? " (sa vidéo, déjà payée, reste dans le dossier du film)" : ""}
      </button>
    </section>
  );
}
