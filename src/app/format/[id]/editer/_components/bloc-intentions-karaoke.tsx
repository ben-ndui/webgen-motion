"use client";

import { changerLesDeclinaisons, languesDesDeclinaisons, versionsDesDeclinaisons } from "@/lib/formats/declinaisons";
import type { KaraokeSpec } from "../../../../../../remotion/film/karaoke/spec";
import type { VersionDuFilm } from "../../../../../../remotion/film/spec";

type Props = { spec: KaraokeSpec; modifier: (changement: (spec: KaraokeSpec) => KaraokeSpec | void) => void };

function Passage({ libelle, debut, fin, onChange }: { libelle: string; debut: number; fin: number; onChange: (debut: number, fin: number) => void }) {
  return (
    <span className="champ-tete">
      <label className="champ-aide">
        {libelle} de{" "}
        <input className="champ-saisie petit" type="number" min={0} step={0.1} value={debut} aria-label={`${libelle} : début`}
          onChange={(e) => onChange(Number(e.target.value), fin)} />
      </label>
      <label className="champ-aide">
        à{" "}
        <input className="champ-saisie petit" type="number" min={0} step={0.1} value={fin} aria-label={`${libelle} : fin`}
          onChange={(e) => onChange(debut, Number(e.target.value))} />{" "}
        s
      </label>
    </span>
  );
}

/**
 * Ce que l'artiste veut : le CLIP COMPLET (16:9, YouTube, tout le morceau) et/ou
 * un TEASER (9:16, réseaux, le passage le plus fort). Chacun garde son passage.
 */
export default function BlocIntentionsKaraoke({ spec, modifier }: Props) {
  const versions = versionsDesDeclinaisons(spec.declinaisons);
  const { morceau } = spec;
  const teaser = morceau.teaser ?? { debut: morceau.debut, fin: Math.min(morceau.debut + 30, morceau.fin) };
  const basculer = (version: VersionDuFilm, coche: boolean) =>
    modifier((s) => {
      const voulues = coche ? [...new Set([...versions, version])] : versions.filter((v) => v !== version);
      s.declinaisons = changerLesDeclinaisons("karaoke", s.declinaisons, languesDesDeclinaisons(s.declinaisons), voulues);
      if (version === "court" && coche && !s.morceau.teaser) s.morceau.teaser = teaser;
    });
  return (
    <section className="bloc" aria-labelledby="bloc-intentions" data-wm-id="format.karaoke.intentions">
      <h3 id="bloc-intentions" className="bloc-titre">Ce que tu veux</h3>
      <label className="case-a-cocher">
        <input type="checkbox" checked={versions.includes("long")} disabled={versions.length === 1 && versions[0] === "long"}
          onChange={(e) => basculer("long", e.target.checked)} />
        Le clip complet, pour YouTube (16:9)
      </label>
      {versions.includes("long") && (
        <Passage libelle="Le clip" debut={morceau.debut} fin={morceau.fin}
          onChange={(debut, fin) => modifier((s) => { s.morceau.debut = debut; s.morceau.fin = fin; })} />
      )}
      <label className="case-a-cocher">
        <input type="checkbox" checked={versions.includes("court")} disabled={versions.length === 1 && versions[0] === "court"}
          onChange={(e) => basculer("court", e.target.checked)} />
        Un teaser pour tes réseaux (9:16)
      </label>
      {versions.includes("court") && (
        <>
          <Passage libelle="Le teaser" debut={teaser.debut} fin={teaser.fin}
            onChange={(debut, fin) => modifier((s) => { s.morceau.teaser = { debut, fin }; })} />
          <p className="champ-aide">Le passage le plus fort, souvent le refrain : 15 à 30 secondes.</p>
        </>
      )}
    </section>
  );
}
