"use client";

import type { EtatDesEcrans } from "./use-ecrans-avec-claude";

type Props = {
  // Le nom de chaque case du groupe (« Étape 1 », « Preuve »).
  cases: string[];
  adresse: string | null;
  etat: EtatDesEcrans;
  proposer: (url: string) => void;
  changerLaPage: (indexDeCase: number, url: string) => void;
  autre: (url: string) => void;
  garder: (url: string) => void;
  refuser: () => void;
};

/**
 * Sous un groupe de cases : Claude propose une page du site par case, avec
 * sa raison ; chaque page se change dans la liste des pages du site, puis
 * « Garder et filmer » remplace le contenu de ces cases.
 */
export default function ChoixAvecClaude({ cases, adresse, etat, proposer, changerLaPage, autre, garder, refuser }: Props) {
  if (etat.type === "lecture" || etat.type === "filmage") {
    return (
      <p className="champ-aide" role="status">
        {etat.etape}
      </p>
    );
  }

  if (etat.type === "proposition" && adresse) {
    return (
      <div className="aide-claude-proposition" role="region" aria-label="Pages proposées par Claude">
        {etat.choix.cases.map((choisie, index) => (
          <label key={choisie.case} className="champ">
            <span className="champ-question">{cases[choisie.case] ?? `Case ${choisie.case + 1}`}</span>
            <select className="champ-saisie" value={etat.urls[index]} onChange={(e) => changerLaPage(index, e.target.value)}>
              {etat.choix.pages.map((page) => (
                <option key={page.url} value={page.url}>
                  {page.titre} — {page.url.replace(/^https?:\/\/(www\.)?/, "")}
                </option>
              ))}
            </select>
            {etat.urls[index] === choisie.url && choisie.raison && <span className="champ-aide">{choisie.raison}</span>}
          </label>
        ))}
        <p className="champ-aide">Garder filme ces pages et remplace ce qu&apos;il y a dans ces cases.</p>
        <div className="aide-claude-gestes">
          <button type="button" className="film-btn" onClick={() => garder(adresse)}>
            Garder et filmer
          </button>
          <button type="button" className="film-btn film-btn-ghost" onClick={() => autre(adresse)}>
            Autre proposition
          </button>
          <button type="button" className="lien" onClick={refuser}>
            Non merci
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="aide-claude">
      {etat.type === "fait" && (
        <div className="champ-aide" role="status">
          <p>
            {etat.resume.moments ? `Moment clé filmé : ${etat.resume.moments} états différents.` : cases.length > 1 ? "Cases filmées." : "Case filmée."}
          </p>
          {etat.resume.echecs.length > 0 && <p>Pas filmé, la case garde ce qu&apos;elle avait : {etat.resume.echecs.join(", ")}.</p>}
        </div>
      )}
      {etat.type === "erreur" && (
        <p className="depot-erreur" role="alert">
          {etat.message}
        </p>
      )}
      <div className="aide-claude-gestes">
        <button type="button" className="film-btn film-btn-ghost" disabled={!adresse} onClick={() => adresse && proposer(adresse)}>
          Choisir les pages avec Claude
        </button>
      </div>
      {!adresse && <p className="champ-aide">Indique l&apos;adresse de ton site, plus haut, pour que Claude la parcoure.</p>}
    </div>
  );
}
