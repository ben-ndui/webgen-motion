"use client";

import { useState } from "react";

import type { KaraokeSpec } from "../../../../../../remotion/film/karaoke/spec";
import type { PropositionDeDecor } from "@/lib/formats/proposer-un-decor";
import FondDUnFormat from "./fond-d-un-format";

type Props = {
  id: string;
  spec: KaraokeSpec;
  prixUsd: string;
  modifier: (changement: (spec: KaraokeSpec) => KaraokeSpec | void) => void;
  enregistrer: () => Promise<boolean>;
};

type EtatDesPropositions = { type: "repos" } | { type: "ecriture" } | { type: "erreur"; message: string } | { type: "proposees"; propositions: PropositionDeDecor[] };

/**
 * Le décor sur mesure : l'artiste le décrit, ou Claude en propose trois
 * d'après ses paroles ; puis Veo le fabrique pour chaque format rendu.
 */
export default function BlocFondSurMesure({ id, spec, prixUsd, modifier, enregistrer }: Props) {
  const [propositions, setPropositions] = useState<EtatDesPropositions>({ type: "repos" });
  const description = spec.fond?.description ?? "";
  const versions = [...new Set(spec.declinaisons.map((d) => d.version))];

  async function proposer() {
    setPropositions({ type: "ecriture" });
    const reponse = await fetch(`/api/motion/formats/${encodeURIComponent(id)}/fond/proposer`, { method: "POST" }).catch(() => null);
    const corps = (await reponse?.json().catch(() => ({}))) as { propositions?: PropositionDeDecor[]; erreur?: string } | undefined;
    if (!reponse?.ok || !corps?.propositions) return setPropositions({ type: "erreur", message: corps?.erreur ?? "Claude n'a pas pu proposer." });
    setPropositions({ type: "proposees", propositions: corps.propositions });
  }

  const decrire = (texte: string) => modifier((s) => { s.fond = { description: texte, videos: s.fond?.videos ?? {} }; });

  return (
    <section className="bloc" aria-labelledby="bloc-sur-mesure" data-wm-id="format.karaoke.sur-mesure">
      <h3 id="bloc-sur-mesure" className="bloc-titre">Ton décor sur mesure</h3>
      <label className="champ">
        <span className="champ-question">Décris-le : un lieu, une lumière, ce qui bouge</span>
        <textarea className="champ-saisie zone" rows={3} maxLength={600} value={description} placeholder="Une rue la nuit sous la pluie, néons orange, reflets sur le bitume"
          onChange={(e) => decrire(e.target.value)} />
      </label>
      <button type="button" className="lien" disabled={propositions.type === "ecriture"} onClick={() => void proposer()}>
        {propositions.type === "ecriture" ? "Claude lit tes paroles…" : "Proposer avec Claude d'après tes paroles"}
      </button>
      <p className="champ-aide">Pour ça, tes paroles sont envoyées à Claude (Anthropic). Le calage, lui, reste sur ton ordinateur.</p>
      {propositions.type === "erreur" && <p className="depot-erreur" role="alert">{propositions.message}</p>}
      {propositions.type === "proposees" && (
        <ul className="film-list" role="status">
          {propositions.propositions.map((p) => (
            <li key={p.titre}>
              <b>{p.titre}</b> · {p.description}{" "}
              <button type="button" className="lien" onClick={() => { decrire(p.description); setPropositions({ type: "repos" }); }}>Prendre celui-ci</button>
            </li>
          ))}
        </ul>
      )}
      <p className="champ-aide">Une vidéo de 8 s, qui boucle sur tout le morceau. Payée sur ta clé Google, une fois par format.</p>
      {versions.map((version) => (
        <FondDUnFormat key={version} id={id} version={version} prixUsd={prixUsd} descriptionPrete={description.trim().length > 0} avantDeGenerer={enregistrer} />
      ))}
    </section>
  );
}
