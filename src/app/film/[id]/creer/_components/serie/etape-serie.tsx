"use client";

import { useCallback, useMemo, useState } from "react";

import { Tabs } from "@/components/ui";
import { fusionnerLEpisodeEcrit, serieDeDepart } from "@/lib/cinema/edition-serie";
import type { CinemaDuFilm } from "../../../../../../../remotion/film/cinema/types";
import type { FilmSpec } from "../../../../../../../remotion/film/spec";
import BibleDeLaSerie from "./bible-de-la-serie";
import DirectionArtistique from "./direction-artistique";
import EcrireAvecClaude from "./ecrire-avec-claude";
import EpisodesAVenir from "./episodes-a-venir";
import EpisodesDeLaSerie from "./episodes-de-la-serie";
import ImporterLaBible from "./importer-la-bible";
import ObjetEtBudget from "./objet-et-budget";
import { useBible } from "./use-bible";
import { useSuiviDesPlans } from "./use-suivi-des-plans";
import MessageAvecReglage from "./message-avec-reglage";

// Quatre sous-onglets plutôt qu'un mur de blocs empilés : la bible seule
// peut compter 8-10 personnages, chacun avec ses vues — avec tout affiché
// en même temps, la page n'en finissait plus de défiler.
type SousOnglet = "ecrire" | "bible" | "reglages" | "episodes";
const SOUS_ONGLETS: { value: SousOnglet; label: string }[] = [
  { value: "ecrire", label: "Écrire la série" },
  { value: "bible", label: "Bible visuelle" },
  { value: "reglages", label: "Réglages & épisodes à venir" },
  { value: "episodes", label: "Épisodes" },
];

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
  const cinema = fiche.cinema;
  // Une série déjà commencée ouvre sur ses épisodes (l'atelier du jour), pas
  // sur la bible (plutôt un réglage qu'on pose puis qu'on retouche rarement).
  const [sousOnglet, setSousOnglet] = useState<SousOnglet>(cinema ? "episodes" : "ecrire");
  // Crée la série de départ si elle n'existe pas encore, puis applique le changement.
  const modifierLaSerie = useCallback(
    (changement: (cinema: CinemaDuFilm) => void) =>
      modifier((copie) => {
        copie.cinema ??= serieDeDepart();
        changement(copie.cinema);
      }),
    [modifier],
  );
  // L'épisode proposé par Claude vient d'une copie de la série reconstruite
  // par le serveur au moment de LA DEMANDE : elle a pu bouger depuis (un
  // import gardé entre-temps, par exemple). On ne remplace donc jamais
  // `cinema` en bloc, on fusionne juste ce que Claude a écrit dans la série
  // ACTUELLE (voir fusionnerLEpisodeEcrit).
  const quandEcrit = (propose: CinemaDuFilm, episodeId: string) => {
    let idReel: string | null = null;
    modifierLaSerie((cinemaActuel) => {
      idReel = fusionnerLEpisodeEcrit(cinemaActuel, propose, episodeId);
    });
    if (idReel) {
      setEpisodeOuvert(idReel);
      // L'épisode écrit vit dans l'onglet « Épisodes » : sans ce bascule, la
      // personne resterait sur « Écrire » sans voir ce qui vient d'arriver.
      setSousOnglet("episodes");
    }
  };
  const ecrire = <EcrireAvecClaude filmId={id} premierEpisode={!cinema} avantDEcrire={enregistrer} quandEcrit={quandEcrit} />;
  // Référence stable (pas recréée à chaque rendu) tant qu'aucune série
  // n'existe encore : ImporterLaBible reste LA MÊME instance React avant et
  // après la création de la série, sinon une proposition de Claude en
  // attente (ou une lecture de PDF en cours) serait perdue en silence au
  // moment où la série apparaît.
  const serieVide = useMemo(() => serieDeDepart(), []);

  const contenuEcrire = (
    <div className="blocs">
      {!cinema && (
        <section className="bloc serie-vide">
          <h3 className="bloc-titre">Une série pour ta marque</h3>
          <p className="champ-aide">
            Des épisodes courts, générés par IA : des personnages qui gardent le même visage d&apos;un plan à l&apos;autre, qui parlent en français, dans
            les couleurs de ta marque. Compte environ 1 $ par plan de 8 secondes avec un personnage, 0,64 $ sans.
          </p>
          <button type="button" className="film-btn film-btn-ghost" onClick={() => modifier((copie) => void (copie.cinema ??= serieDeDepart()))}>
            Commencer la série à la main
          </button>
        </section>
      )}
      <ImporterLaBible filmId={id} cinema={cinema ?? serieVide} modifierLaSerie={modifierLaSerie} />
      {ecrire}
    </div>
  );

  // La racine garde TOUJOURS la même forme, qu'il y ait une série ou non :
  // sinon, le passage d'une forme à l'autre au moment où « cinema » apparaît
  // démonte tout (ImporterLaBible y compris) et perd une proposition de
  // Claude en vol, exactement ce que ce composant promet de ne jamais faire.
  return (
    <div className="serie-onglets">
      {cinema && <Tabs<SousOnglet> tabs={SOUS_ONGLETS} value={sousOnglet} onValueChange={setSousOnglet} />}
      {cinema && proposeeDepuisLeSite && (
        <p className="champ-aide serie-proposee" role="status">
          Un premier épisode a été proposé depuis ton site : relis les consignes, les répliques et le casting avant de générer quoi que ce soit.
        </p>
      )}
      {/* Chaque panneau reste MONTÉ même masqué (div nue, sans classe : un
          attribut hidden sur un élément qui porte aussi une classe à
          `display` perd face à elle à spécificité égale). Changer d'onglet
          ne doit jamais couper une demande à Claude en vol (import, écriture
          d'épisode, description d'une référence). */}
      <div hidden={cinema ? sousOnglet !== "ecrire" : false}>{contenuEcrire}</div>
      {cinema && (
        <SerieDuFilm id={id} cinema={cinema} declinaisons={fiche.declinaisons} modifierLaSerie={modifierLaSerie} enregistrer={enregistrer} episodeOuvert={episodeOuvert} sousOnglet={sousOnglet} />
      )}
    </div>
  );
}

type PropsDeLaSerie = {
  id: string;
  cinema: CinemaDuFilm;
  declinaisons: FilmSpec["declinaisons"];
  modifierLaSerie: (changement: (cinema: CinemaDuFilm) => void) => void;
  enregistrer: Props["enregistrer"];
  episodeOuvert: string | null;
  sousOnglet: SousOnglet;
};

function SerieDuFilm({ id, cinema, declinaisons, modifierLaSerie, enregistrer, episodeOuvert, sousOnglet }: PropsDeLaSerie) {
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
  // pour griser « Générer » tant qu'une référence n'est pas validée. Toujours
  // montée (même sur un autre onglet) : changer d'onglet ne doit pas couper
  // un import ou une génération d'image en cours.
  const bible = useBible(id, enregistrer);

  return (
    <div className="serie">
      {blocage && (
        <p className="depot-erreur" role="alert">
          <MessageAvecReglage message={blocage} />
        </p>
      )}
      <div hidden={sousOnglet !== "bible"}>
        <BibleDeLaSerie filmId={id} cinema={cinema} modifierLaSerie={modifierLaSerie} bible={bible} />
      </div>
      <div hidden={sousOnglet !== "reglages"} className="blocs">
        <DirectionArtistique cinema={cinema} modifierLaSerie={modifierLaSerie} />
        <ObjetEtBudget filmId={id} cinema={cinema} enregistrer={enregistrer} budget={budget} modifierLaSerie={modifierLaSerie} />
        <EpisodesAVenir cinema={cinema} modifierLaSerie={modifierLaSerie} />
      </div>
      <div hidden={sousOnglet !== "episodes"}>
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
    </div>
  );
}
