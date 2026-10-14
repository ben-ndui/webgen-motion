"use client";

import Link from "next/link";
import { useState } from "react";

import { Tabs } from "@/components/ui";
import type { EtatDeLEditeur } from "@/lib/film-editeur";
import { LANGUES, type Langue } from "../../../../../../remotion/film/spec";
import EtapeEcrans from "./etape-ecrans";
import EtapeHistoire from "./etape-histoire";
import EtapeMarque from "./etape-marque";
import EtapeMusique from "./etape-musique";
import EtapePret from "./etape-pret";
import IndicateurDEnregistrement from "./indicateur-d-enregistrement";
import RemplirDepuisLeSite from "./remplir-depuis-le-site";
import EtapeSerie from "./serie/etape-serie";
import { useFicheDuFilm } from "./use-fiche-du-film";

export type Etape = "marque" | "serie" | "musique" | "ecrans" | "histoire" | "pret";
const ORDRE: Etape[] = ["marque", "serie", "musique", "ecrans", "histoire", "pret"];
const TITRES: Record<Etape, string> = {
  marque: "Ta marque",
  serie: "Ta série",
  musique: "Le son",
  ecrans: "Tes écrans",
  histoire: "Ton histoire",
  pret: "C'est prêt ?",
};

/**
 * L'assistant de création d'un film : six étapes dans l'ordre où on a les
 * choses sous la main (logo et couleurs, série générée par IA, musique,
 * captures, textes). Tout s'enregistre seul ; on peut revenir à n'importe
 * quelle étape.
 */
type Props = { etatInitial: EtatDeLEditeur; adresseAuDepart?: string };

export default function AssistantDuFilm({ etatInitial, adresseAuDepart }: Props) {
  const { etat, fiche, enregistrement, modifier, enregistrer, deposer, recharger } = useFicheDuFilm(etatInitial);
  const [occupe, setOccupe] = useState(false);
  const [etape, setEtape] = useState<Etape>("marque");
  const langues: Langue[] = LANGUES.filter((l) => fiche.declinaisons.some((d) => d.langue === l));
  const [langue, setLangue] = useState<Langue>(langues[0] ?? "fr");
  const present = (role: string) => etat.medias.some((m) => m.role === role && m.present);
  const capturesManquantes = etat.medias.filter((m) => m.role === "capture" && !m.present).length;
  const textesAEcrire = etat.textesAEcrire.filter((t) => t.langue === langue || langues.length === 1).length;
  const rang = ORDRE.indexOf(etape);

  const badges: Partial<Record<Etape, number>> = { ecrans: capturesManquantes, histoire: textesAEcrire };
  const onglets = ORDRE.map((e, i) => ({
    value: e,
    label: TITRES[e],
    number: String(i + 1).padStart(2, "0"),
    badge: badges[e] ? <span className="onglet-reste">{badges[e]}</span> : undefined,
  }));

  return (
    <div className="assistant">
      <div className="assistant-barre">
        <Tabs<Etape> tabs={onglets} value={etape} onValueChange={setEtape} className="assistant-onglets" />
        <IndicateurDEnregistrement etat={enregistrement} onReessayer={() => void enregistrer()} />
      </div>

      {etape === "histoire" && langues.length > 1 && (
        <div className="langues" role="tablist" aria-label="Langue des textes">
          {langues.map((l) => (
            <button key={l} type="button" role="tab" aria-selected={l === langue} className={l === langue ? "actif" : ""} onClick={() => setLangue(l)}>
              Textes en {l === "fr" ? "français" : "anglais"}
            </button>
          ))}
        </div>
      )}

      {!etat.valide && etape !== "pret" && (
        <p className="depot-erreur" role="alert">
          La fiche a des erreurs : les dépôts de fichiers sont bloqués. Le détail est à l&apos;étape « C&apos;est prêt ? ».
        </p>
      )}

      {/* Toujours monté : changer d'étape pendant un remplissage ne doit ni le
          couper ni laisser le formulaire gelé. Visible à l'étape 1, ou tant qu'il tourne. */}
      <div hidden={etape !== "marque" && !occupe}>
        <RemplirDepuisLeSite id={etat.id} adresseAuDepart={adresseAuDepart} avantDeLancer={enregistrer} recharger={recharger} onOccupe={setOccupe} />
      </div>

      <fieldset className="assistant-etapes" disabled={occupe} aria-busy={occupe}>
      {etape === "marque" && <EtapeMarque id={etat.id} fiche={fiche} modifier={modifier} deposer={deposer} logoPresent={present("logo")} propositions={etat.propositions} medias={etat.medias} />}
      {etape === "serie" && <EtapeSerie id={etat.id} fiche={fiche} modifier={modifier} enregistrer={enregistrer} proposeeDepuisLeSite={Boolean(etat.propositions["cinema"])} />}
      {etape === "musique" && (
        <EtapeMusique id={etat.id} fiche={fiche} langues={langues} musiquePresente={present("musique")} deposer={deposer} modifier={modifier} enregistrer={enregistrer} recharger={recharger} />
      )}
      {etape === "ecrans" && <EtapeEcrans id={etat.id} fiche={fiche} langues={langues} medias={etat.medias} doublons={etat.doublons} deposer={deposer} modifier={modifier} />}
      {etape === "histoire" && <EtapeHistoire fiche={fiche} langue={langue} propositions={etat.propositions} suggestions={etat.suggestions} modifier={modifier} />}
      {etape === "pret" && <EtapePret id={etat.id} etat={etat} fiche={fiche} modifier={modifier} enregistrer={enregistrer} onAller={(e) => setEtape(e)} />}

      </fieldset>

      <nav className="assistant-pied" aria-label="Étapes">
        {rang > 0 ? (
          <button type="button" className="film-btn film-btn-ghost" onClick={() => setEtape(ORDRE[rang - 1]!)}>
            ← {TITRES[ORDRE[rang - 1]!]}
          </button>
        ) : (
          <Link className="film-btn film-btn-ghost" href={`/film/${etat.id}`}>Voir la page du film</Link>
        )}
        {rang < ORDRE.length - 1 && (
          <button type="button" className="film-btn" onClick={() => setEtape(ORDRE[rang + 1]!)}>
            {TITRES[ORDRE[rang + 1]!]} →
          </button>
        )}
      </nav>
    </div>
  );
}
