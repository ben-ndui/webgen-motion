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
import { useFicheDuFilm } from "./use-fiche-du-film";

export type Etape = "marque" | "musique" | "ecrans" | "histoire" | "pret";
const ORDRE: Etape[] = ["marque", "musique", "ecrans", "histoire", "pret"];
const TITRES: Record<Etape, string> = {
  marque: "Ta marque",
  musique: "Ta musique",
  ecrans: "Tes écrans",
  histoire: "Ton histoire",
  pret: "C'est prêt ?",
};

/**
 * L'assistant de création d'un film : cinq étapes dans l'ordre où on a les
 * choses sous la main (logo et couleurs, musique, captures, textes). Tout
 * s'enregistre seul ; on peut revenir à n'importe quelle étape.
 */
export default function AssistantDuFilm({ etatInitial }: { etatInitial: EtatDeLEditeur }) {
  const { etat, fiche, enregistrement, modifier, enregistrer, deposer } = useFicheDuFilm(etatInitial);
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
        <Tabs<Etape> tabs={onglets} value={etape} onValueChange={setEtape} />
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

      {etape === "marque" && <EtapeMarque id={etat.id} fiche={fiche} modifier={modifier} deposer={deposer} logoPresent={present("logo")} />}
      {etape === "musique" && <EtapeMusique fiche={fiche} musiquePresente={present("musique")} deposer={deposer} />}
      {etape === "ecrans" && <EtapeEcrans id={etat.id} fiche={fiche} langues={langues} medias={etat.medias} deposer={deposer} modifier={modifier} />}
      {etape === "histoire" && <EtapeHistoire fiche={fiche} langue={langue} modifier={modifier} />}
      {etape === "pret" && <EtapePret id={etat.id} etat={etat} fiche={fiche} modifier={modifier} enregistrer={enregistrer} onAller={(e) => setEtape(e)} />}

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
