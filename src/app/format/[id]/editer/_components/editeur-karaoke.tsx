"use client";

import { KARAOKE } from "../../../../../../remotion/film/karaoke/ficheKaraoke";
import type { KaraokeSpec } from "../../../../../../remotion/film/karaoke/spec";
import type { Langue } from "../../../../../../remotion/film/spec";
import { useState } from "react";

import type { Passage } from "../../../../../../remotion/film/karaoke/lecture";
import ChampTexte from "../../../../film/[id]/creer/_components/champ-texte";
import DepotDeMusique from "../../_components/depot-de-musique";
import BlocIntentionsKaraoke from "./bloc-intentions-karaoke";
import { COUT_D_UN_PLAN_USD, enDollars } from "@/lib/cinema/couts";
import BlocFondSurMesure from "./bloc-fond-sur-mesure";
import BlocParoles from "./bloc-paroles";
import ChoixDuDecor from "./choix-du-decor";

type Props = {
  id: string;
  spec: KaraokeSpec;
  langue: Langue;
  morceauPresent: boolean;
  modifier: (changement: (spec: KaraokeSpec) => KaraokeSpec | void) => void;
  // Après le dépôt du morceau : reprendre du serveur ce qu'il a mesuré (fichier, tempo, passage).
  apresLeDepot: () => void;
  // Avant de lancer une génération payante : la description tapée doit être sur le disque.
  enregistrer: () => Promise<boolean>;
};

/** L'éditeur du clip karaoké : le morceau et son passage, les paroles, la ligne de fin. */
export default function EditeurKaraoke({ id, spec, langue, morceauPresent, modifier, apresLeDepot, enregistrer }: Props) {
  const { morceau } = spec;
  const [refrain, setRefrain] = useState<Passage | null>(null);
  return (
    <div className="blocs" data-wm-id="format.karaoke">
      <section className="bloc" aria-labelledby="bloc-morceau">
        <h3 id="bloc-morceau" className="bloc-titre">Ton morceau</h3>
        <DepotDeMusique id={id} karaoke onDepose={apresLeDepot} />
        {morceauPresent && <p className="champ-aide">Tempo mesuré : {morceau.tempo} BPM. Le décor bat dessus.</p>}
        <ChampTexte question="Son titre" max={30} valeur={morceau.titre} exemple={KARAOKE.morceau.titre}
          onChange={(titre) => modifier((s) => { s.morceau.titre = titre; })} />
        <ChampTexte question="Ton nom d'artiste" max={30} valeur={morceau.artiste} exemple={KARAOKE.morceau.artiste}
          onChange={(artiste) => modifier((s) => { s.morceau.artiste = artiste; })} />
      </section>
      <BlocIntentionsKaraoke spec={spec} modifier={modifier} refrain={refrain} />
      <ChoixDuDecor decor={spec.decor} onChange={(decor) => modifier((s) => { s.decor = decor; })} />
      {spec.decor === "sur-mesure" && <BlocFondSurMesure id={id} spec={spec} prixUsd={enDollars(COUT_D_UN_PLAN_USD.lite)} modifier={modifier} enregistrer={enregistrer} />}
      <BlocParoles id={id} morceauPresent={morceauPresent} surLeRefrain={setRefrain} />
      <section className="bloc" aria-labelledby="bloc-fin">
        <h3 id="bloc-fin" className="bloc-titre">La fin</h3>
        <ChampTexte question="La ligne sous ton nom" max={50} valeur={spec.textes[langue].disponible} exemple={KARAOKE.textes[langue].disponible}
          aide="« Disponible sur toutes les plateformes », « Extrait de l'EP… »" onChange={(v) => modifier((s) => { s.textes[langue].disponible = v; })} />
      </section>
    </div>
  );
}
