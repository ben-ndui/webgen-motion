"use client";

import { type ReactNode, useCallback, useState } from "react";

import { serieDeDepart } from "@/lib/cinema/edition-serie";
import type { CinemaDuFilm } from "../../../../../../../remotion/film/cinema/types";
import type { FilmSpec } from "../../../../../../../remotion/film/spec";
import BibleDeLaSerie from "./bible-de-la-serie";
import EcrireAvecClaude from "./ecrire-avec-claude";
import EpisodesAVenir from "./episodes-a-venir";
import EpisodesDeLaSerie from "./episodes-de-la-serie";
import ImporterLaBible from "./importer-la-bible";
import ObjetEtBudget from "./objet-et-budget";
import { useBible } from "./use-bible";
import { useSuiviDesPlans } from "./use-suivi-des-plans";
import MessageAvecReglage from "./message-avec-reglage";

type Props = {
  id: string;
  fiche: FilmSpec;
  modifier: (changement: (copie: FilmSpec) => void) => void;
  enregistrer: () => Promise<boolean>;
  // Le remplissage depuis le site a écrit un premier épisode : à relire avant de générer.
  proposeeDepuisLeSite?: boolean;
};

/**
 * L'étape « Série » : le casting, l'objet du film, puis les épisodes, leurs
 * scènes et leurs plans, générés un par un avec le coût affiché avant le
 * clic. Le serveur reste la vérité de chaque plan (prêt, en cours, refusé).
 */
export default function EtapeSerie({ id, fiche, modifier, enregistrer, proposeeDepuisLeSite = false }: Props) {
  // L'épisode à ouvrir après une écriture par Claude (sinon le premier).
  const [episodeOuvert, setEpisodeOuvert] = useState<string | null>(null);
  const quandEcrit = (cinema: CinemaDuFilm, episodeId: string) => {
    modifier((copie) => void (copie.cinema = cinema));
    setEpisodeOuvert(episodeId);
  };
  const cinema = fiche.cinema;
  const ecrire = <EcrireAvecClaude filmId={id} premierEpisode={!cinema} avantDEcrire={enregistrer} quandEcrit={quandEcrit} />;
  if (!cinema) return <SerieAbsente ecrire={ecrire} onCommencer={() => modifier((copie) => void (copie.cinema = serieDeDepart()))} />;
  return (
    <>
      {proposeeDepuisLeSite && (
        <p className="champ-aide serie-proposee" role="status">
          Un premier épisode a été proposé depuis ton site : relis les consignes, les répliques et le casting avant de générer quoi que ce soit.
        </p>
      )}
      <SerieDuFilm id={id} cinema={cinema} declinaisons={fiche.declinaisons} modifier={modifier} enregistrer={enregistrer} ecrire={ecrire} episodeOuvert={episodeOuvert} />
    </>
  );
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
  const { suivis, versions: versionsDesPlans, budget, blocage, generer, rafraichir } = useSuiviDesPlans(id, planIds, enregistrer, quandUnPlanArrive);
  // Remontée ici (pas dans BibleDeLaSerie) : les plans en ont besoin aussi,
  // pour griser « Générer » tant qu'une référence n'est pas validée.
  const bible = useBible(id, enregistrer);

  return (
    <div className="serie">
      {blocage && (
        <p className="depot-erreur" role="alert">
          <MessageAvecReglage message={blocage} />
        </p>
      )}
      <div className="blocs">
        <ImporterLaBible filmId={id} cinema={cinema} modifierLaSerie={modifierLaSerie} />
        <BibleDeLaSerie filmId={id} cinema={cinema} modifierLaSerie={modifierLaSerie} bible={bible} />
        <ObjetEtBudget filmId={id} cinema={cinema} enregistrer={enregistrer} budget={budget} modifierLaSerie={modifierLaSerie} />
        <EpisodesAVenir cinema={cinema} modifierLaSerie={modifierLaSerie} />
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
        references={bible.references}
        modifierLaSerie={modifierLaSerie}
        onGenerer={(planId) => void generer(planId)}
        onRafraichir={(planId) => void rafraichir(planId)}
        declinaisons={declinaisons}
        enregistrer={enregistrer}
      />
    </div>
  );
}
