"use client";

import { useState } from "react";

import { LONGUEUR_MAX_DE_LA_BIBLE_COLLEE } from "@/lib/cinema/assistant/types";
import type { CinemaDuFilm } from "../../../../../../../remotion/film/cinema/types";
import AideDeClaude from "./aide-de-claude";
import { useAssistant } from "./use-assistant";

type Props = {
  filmId: string;
  cinema: CinemaDuFilm;
  modifierLaSerie: (changement: (cinema: CinemaDuFilm) => void) => void;
};

const TEXTE_MIN = 20;

/**
 * Coller la bible de production de la cliente (personnages, monde, épisodes
 * déjà écrits ou résumés) : Claude en extrait les personnages, les
 * créatures/objets/décors et un brief par épisode. Même proposition à
 * garder ou non que le reste de l'assistant : rien n'est ajouté d'un clic.
 */
export default function ImporterLaBible({ filmId, cinema, modifierLaSerie }: Props) {
  const [texte, setTexte] = useState("");
  const assistant = useAssistant(filmId, cinema, modifierLaSerie);
  const enCours = assistant.etat.type === "en-cours";

  return (
    <section className="bloc importer-bible" aria-label="Importer la bible de la série">
      <h3 className="bloc-titre">Importer la bible de la série</h3>
      <p className="champ-aide">
        Colle le texte de la bible de production de ta cliente (personnages, monde, épisodes déjà écrits ou résumés) :
        Claude en extrait ce qu&apos;il trouve. Rien n&apos;est ajouté avant que tu l&apos;acceptes, comme chaque proposition.
      </p>
      <textarea
        className="champ-saisie zone"
        rows={6}
        value={texte}
        disabled={enCours}
        maxLength={LONGUEUR_MAX_DE_LA_BIBLE_COLLEE}
        placeholder="Colle ici le texte de sa bible…"
        onChange={(e) => setTexte(e.target.value)}
      />
      <span className="champ-compteur" aria-live="polite">
        {texte.length} / {LONGUEUR_MAX_DE_LA_BIBLE_COLLEE}
      </span>
      <button
        type="button"
        className="film-btn film-btn-ghost"
        disabled={enCours || texte.trim().length < TEXTE_MIN}
        onClick={() => void assistant.demander({ type: "importer-bible", texte: texte.trim() })}
      >
        {enCours ? "Claude lit la bible…" : "Importer avec Claude"}
      </button>
      <AideDeClaude
        cinema={cinema}
        gestes={[]}
        etat={assistant.etat}
        demander={(d) => void assistant.demander(d)}
        // Le texte ne se vide qu'une fois GARDÉ : sur une erreur (pas de clé,
        // série invalide, réponse coupée…) ou sur « Non merci », il reste
        // collé, rien à retrouver et recoller pour relancer.
        garder={() => assistant.garder(() => setTexte(""))}
        refuser={assistant.refuser}
        autre={assistant.autre}
        visibleSansGeste
        permettreAutre={false}
      />
    </section>
  );
}
