"use client";

import { type ReactNode, useCallback, useState } from "react";

import { serieDeDepart } from "@/lib/cinema/edition-serie";
import type { CinemaDuFilm } from "../../../../../../../remotion/film/cinema/types";
import type { FilmSpec } from "../../../../../../../remotion/film/spec";
import Casting from "./casting";
import EcrireAvecClaude from "./ecrire-avec-claude";
import EpisodesDeLaSerie from "./episodes-de-la-serie";
import ObjetEtBudget from "./objet-et-budget";
import { usePortraits } from "./use-portraits";
import { useSuiviDesPlans } from "./use-suivi-des-plans";

type Props = {
  id: string;
  fiche: FilmSpec;
  modifier: (changement: (copie: FilmSpec) => void) => void;
  enregistrer: () => Promise<boolean>;
};

/**
 * L'étape « Série » : le casting, l'objet du film, puis les épisodes, leurs
 * scènes et leurs plans, générés un par un avec le coût affiché avant le
 * clic. Le serveur reste la vérité de chaque plan (prêt, en cours, refusé).
 */
export default function EtapeSerie({ id, fiche, modifier, enregistrer }: Props) {
  // L'épisode à ouvrir après une écriture par Claude (sinon le premier).
  const [episodeOuvert, setEpisodeOuvert] = useState<string | null>(null);
  const quandEcrit = (cinema: CinemaDuFilm, episodeId: string) => {
    modifier((copie) => void (copie.cinema = cinema));
    setEpisodeOuvert(episodeId);
  };
  const cinema = fiche.cinema;
  const ecrire = <EcrireAvecClaude filmId={id} premierEpisode={!cinema} avantDEcrire={enregistrer} quandEcrit={quandEcrit} />;
  if (!cinema) return <SerieAbsente ecrire={ecrire} onCommencer={() => modifier((copie) => void (copie.cinema = serieDeDepart()))} />;
  return <SerieDuFilm id={id} cinema={cinema} declinaisons={fiche.declinaisons} modifier={modifier} enregistrer={enregistrer} ecrire={ecrire} episodeOuvert={episodeOuvert} />;
}

function SerieAbsente({ onCommencer, ecrire }: { onCommencer: () => void; ecrire: ReactNode }) {
  return (
    <div className="blocs">
      <section className="bloc serie-vide">
        <h3 className="bloc-titre">Une série pour ta marque</h3>
        <p className="champ-aide">
          Des épisodes courts, générés par IA : des personnages qui gardent le même visage d&apos;un plan à l&apos;autre, qui parlent en français, dans les
          couleurs de ta marque. Compte environ 1 $ par plan de 8 secondes avec un personnage, 0,64 $ sans.
        </p>
        <button type="button" className="film-btn film-btn-ghost" onClick={onCommencer}>
          Commencer la série à la main
        </button>
      </section>
      {ecrire}
    </div>
  );
}

type PropsDeLaSerie = {
  id: string;
  cinema: CinemaDuFilm;
  declinaisons: FilmSpec["declinaisons"];
  modifier: Props["modifier"];
  enregistrer: Props["enregistrer"];
  ecrire: ReactNode;
  episodeOuvert: string | null;
};

function SerieDuFilm({ id, cinema, declinaisons, modifier, enregistrer, ecrire, episodeOuvert }: PropsDeLaSerie) {
  const modifierLaSerie = useCallback(
    (changement: (cinema: CinemaDuFilm) => void) =>
      modifier((copie) => {
        if (copie.cinema) changement(copie.cinema);
      }),
    [modifier],
  );
  const planIds = cinema.episodes.flatMap((e) => e.scenes.flatMap((s) => s.plans.map((p) => p.id)));
  const quandUnPlanArrive = useCallback(
    (planId: string) =>
      modifierLaSerie((c) => {
        const plan = c.episodes.flatMap((e) => e.scenes.flatMap((s) => s.plans)).find((p) => p.id === planId);
        if (plan) delete plan.decoupe;
      }),
    [modifierLaSerie],
  );
  const { suivis, versions: versionsDesPlans, budget, blocage, generer } = useSuiviDesPlans(id, planIds, enregistrer, quandUnPlanArrive);
  const [versions, setVersions] = useState<Record<string, number>>({});
  const quandLePortraitEstPret = useCallback(
    (personnageId: string, portrait: string) => {
      modifierLaSerie((c) => {
        const personnage = c.personnages.find((p) => p.id === personnageId);
        if (personnage) personnage.portrait = portrait;
      });
      // Même adresse, nouvelle image : la version force le navigateur à la recharger.
      setVersions((avant) => ({ ...avant, [personnageId]: Date.now() }));
    },
    [modifierLaSerie],
  );
  const portraits = usePortraits(id, enregistrer, quandLePortraitEstPret);

  return (
    <div className="serie">
      {blocage && (
        <p className="depot-erreur" role="alert">
          {blocage} {blocage.includes("Réglages") && <a href="/setup">Ouvrir les Réglages</a>}
        </p>
      )}
      <div className="blocs">
        <Casting
          filmId={id}
          cinema={cinema}
          etats={portraits.etats}
          suivis={suivis}
          versions={versions}
          modifierLaSerie={modifierLaSerie}
          onGenererLePortrait={(personnageId) => void portraits.generer(personnageId)}
        />
        <ObjetEtBudget filmId={id} cinema={cinema} enregistrer={enregistrer} budget={budget} modifierLaSerie={modifierLaSerie} />
        {ecrire}
      </div>
      <EpisodesDeLaSerie
        key={episodeOuvert ?? "premier"}
        episodeOuvert={episodeOuvert}
        filmId={id}
        cinema={cinema}
        suivis={suivis}
        versionsDesPlans={versionsDesPlans}
        blocage={blocage}
        modifierLaSerie={modifierLaSerie}
        onGenerer={(planId) => void generer(planId)}
        declinaisons={declinaisons}
        enregistrer={enregistrer}
      />
    </div>
  );
}
