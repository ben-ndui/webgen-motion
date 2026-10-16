"use client";

import { ajouterUneScene } from "@/lib/formats/edition-explainer";
import { EXPLAINER } from "../../../../../../remotion/film/explainer/ficheExplainer";
import type { ExplainerSpec } from "../../../../../../remotion/film/explainer/spec";
import type { Langue } from "../../../../../../remotion/film/spec";
import ChampTexte from "../../../../film/[id]/creer/_components/champ-texte";
import CarteDeScene from "./carte-de-scene";

type Props = { spec: ExplainerSpec; langue: Langue; modifier: (changement: (spec: ExplainerSpec) => ExplainerSpec | void) => void };

/**
 * Les scènes de l'explainer, dans l'ordre où elles passent, puis la signature
 * de fin. La phrase finale reste la dernière : une scène ajoutée se glisse avant.
 */
export default function EditeurExplainer({ spec, langue, modifier }: Props) {
  return (
    <div className="blocs" data-wm-id="format.explainer">
      {spec.scenes.map((scene, index) => (
        <CarteDeScene key={scene.id} spec={spec} index={index} langue={langue} modifier={modifier} />
      ))}
      <section className="bloc" aria-labelledby="bloc-ajouter">
        <h3 id="bloc-ajouter" className="bloc-titre">Une scène de plus ?</h3>
        <p className="champ-aide">Elle se glisse avant la phrase finale, vide : tu choisis ensuite ce qu&apos;elle montre.</p>
        <button type="button" className="film-btn" onClick={() => modifier((s) => ajouterUneScene(s, s.scenes.length))}>Ajouter une scène</button>
      </section>
      <section className="bloc" aria-labelledby="bloc-signature">
        <h3 id="bloc-signature" className="bloc-titre">La signature</h3>
        <ChampTexte question="La ligne sous ton nom, à la fin" max={50} valeur={spec.textes[langue].signature} exemple={EXPLAINER.textes[langue].signature}
          onChange={(signature) => modifier((s) => { s.textes[langue].signature = signature; })} />
      </section>
    </div>
  );
}
